"""
Parse all checkpoint .txt files and insert questions into PostgreSQL.
Run after OCR batches complete.
"""
import os, re, json, glob

CHECKPOINT_DIR = ".agents/outputs/pages"

SUBJECT_RANGES = [
    (6,   141, "Public Service Rules"),
    (142, 341, "Financial Regulations"),
    (342, 368, "Administrative Procedures"),
    (369, 565, "Civil Service Handbook"),
    (566, 598, "Current Affairs"),
]

SUBJECT_IDS = {
    "Public Service Rules": 9,
    "Financial Regulations": 10,
    "Administrative Procedures": 11,
    "Civil Service Handbook": 12,
    "Current Affairs": 13,
}
EXAM_TYPE_ID = 5

def get_subject(page_idx):
    for start, end, name in SUBJECT_RANGES:
        if start <= page_idx <= end:
            return name
    return None

def parse_questions(text, subject, page_idx):
    questions = []
    text = re.sub(r'[\.\s]*New Track Publication\s*', '', text)
    text = re.sub(r'[✅✓☑]\s*', '', text)
    text = re.sub(r'\r\n', '\n', text)
    text = re.sub(r'\n{3,}', '\n\n', text)

    # Split on question number at start of line followed by capital letter
    blocks = re.split(r'(?m)^(?=\d{1,3}\.\s+[A-Z\'\"(])', text)

    for block in blocks:
        block = block.strip()
        if not block:
            continue

        q_match = re.match(r'^(\d{1,3})\.\s+(.+?)(?=\n[A-D][.)]\s|\Z)', block, re.DOTALL)
        if not q_match:
            continue

        q_num = int(q_match.group(1))
        if q_num < 1 or q_num > 9999:
            continue

        # Question text: take up to first option line
        raw_q = q_match.group(2)
        lines = raw_q.split('\n')
        q_lines = []
        for line in lines:
            if re.match(r'^[A-D][.)]\s', line):
                break
            q_lines.append(line)
        q_text = re.sub(r'\s+', ' ', ' '.join(q_lines)).strip()
        if len(q_text) < 6:
            continue

        # Extract options A–D
        options = {}
        for letter in 'ABCD':
            pat = rf'(?m)^{letter}[.)]\s+(.+?)(?=^[A-D][.)]\s|^Correct|^Answer|\Z)'
            m = re.search(pat, block, re.DOTALL | re.MULTILINE)
            if m:
                opt = re.sub(r'\s+', ' ', m.group(1)).strip()
                opt = re.sub(r'\s*\d+$', '', opt).strip()
                if opt:
                    options[letter] = opt

        if len(options) < 2:
            continue

        ans_m = re.search(r'Correct\s+Answer\s*[:\-]?\s*([A-D])', block, re.IGNORECASE)
        if not ans_m:
            ans_m = re.search(r'Answer\s*[:\-]\s*([A-D])\b', block, re.IGNORECASE)
        if not ans_m:
            continue
        correct = ans_m.group(1).upper()

        exp_m = re.search(r'Explanation\s*[:\-]?\s*(.+)', block, re.DOTALL | re.IGNORECASE)
        explanation = None
        if exp_m:
            exp = re.sub(r'\s+', ' ', exp_m.group(1).strip())
            exp = re.sub(r'\s*\d{1,3}\.\s+[A-Z\'\"(].+$', '', exp).strip()
            explanation = exp if len(exp) > 5 else None

        opts_list = [{"letter": l, "text": options[l]} for l in 'ABCD' if l in options]
        if len(opts_list) < 2:
            continue

        questions.append({
            "num": q_num,
            "text": q_text,
            "subject": subject,
            "subject_id": SUBJECT_IDS[subject],
            "exam_type_id": EXAM_TYPE_ID,
            "year": 2025,
            "options": opts_list,
            "correct_letter": correct,
            "explanation": explanation,
            "page_idx": page_idx,
        })

    return questions

def main():
    txt_files = sorted(glob.glob(f"{CHECKPOINT_DIR}/page_*.txt"))
    print(f"Found {len(txt_files)} checkpoint files")

    all_questions = []
    for txt_file in txt_files:
        fname = os.path.basename(txt_file)
        page_idx = int(re.search(r'page_(\d+)', fname).group(1))
        subject = get_subject(page_idx)
        if not subject:
            continue
        with open(txt_file, encoding='utf-8') as f:
            text = f.read()
        qs = parse_questions(text, subject, page_idx)
        all_questions.extend(qs)

    print(f"Total parsed: {len(all_questions)} questions (before dedup)")

    # Deduplicate
    seen = set()
    unique = []
    for q in all_questions:
        key = (q['subject'], q['num'], q['text'][:50])
        if key not in seen:
            seen.add(key)
            unique.append(q)

    print(f"Unique questions: {len(unique)}")

    # Save for JS import
    with open(".agents/outputs/questions_all.json", "w", encoding="utf-8") as f:
        json.dump(unique, f, ensure_ascii=False, indent=2)
    print("Saved to .agents/outputs/questions_all.json")

    # Also print subject breakdown
    from collections import Counter
    c = Counter(q['subject'] for q in unique)
    for subj, cnt in sorted(c.items()):
        print(f"  {subj}: {cnt}")

if __name__ == "__main__":
    main()
