"""
Extract all questions from the Federal Civil Service PDF and save to JSON.
Uses multiprocessing for speed. Parses format:
  N. Question text
  A. Option A
  B. Option B
  C. Option C
  D. Option D
  [✅] Correct Answer: X
  Explanation: ...
"""

import fitz
import pytesseract
from PIL import Image
import io
import re
import json
import multiprocessing
import os

PDF = "attached_assets/fedcv-exams-google-format_1600_pdf.gdrive.vip_1784115872047.pdf"

# --- Subject ranges (PDF page index, 0-based) from Table of Contents ---
# ToC display page numbers map 1:1 to PDF page index
SUBJECT_RANGES = [
    (6,  141, "Public Service Rules"),
    (142, 341, "Financial Regulations"),
    (342, 368, "Administrative Procedures"),
    (369, 565, "Civil Service Handbook"),
    (566, 598, "Current Affairs"),
]

def get_subject(page_idx):
    for start, end, name in SUBJECT_RANGES:
        if start <= page_idx <= end:
            return name
    return None

def ocr_page(args):
    page_idx, pdf_path = args
    try:
        doc = fitz.open(pdf_path)
        page = doc[page_idx]
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
        doc.close()
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        text = pytesseract.image_to_string(img, config="--psm 6")
        return page_idx, text
    except Exception as e:
        return page_idx, ""

def parse_questions(text, subject, year=2025):
    """Parse questions from OCR text of one or more pages."""
    questions = []

    # Normalise common OCR artefacts
    text = re.sub(r'\. New Track Publication\s*', '', text)
    text = re.sub(r'New Track Publication\s*', '', text)
    text = re.sub(r'✅\s*', '', text)
    text = re.sub(r'[✓☑]\s*', '', text)
    text = re.sub(r'\r\n', '\n', text)
    text = re.sub(r'\n{3,}', '\n\n', text)

    # Track current topic (Part headers)
    current_topic = None
    topic_match = re.search(r'(?:Part\s+\d+|Chapter\s+\d+|Section\s+[A-Z])[\s:]+([A-Z][^\n]{3,60})', text)
    if topic_match:
        current_topic = topic_match.group(1).strip()

    # Split into question blocks by "N. " pattern at start of line
    blocks = re.split(r'\n(?=\d{1,3}\.\s)', text)

    for block in blocks:
        block = block.strip()
        if not block:
            continue

        # Must start with a question number
        q_match = re.match(r'^(\d{1,3})\.\s+(.+?)(?=\nA\.\s|\nA\))', block, re.DOTALL)
        if not q_match:
            continue
        q_num = int(q_match.group(1))
        q_text = q_match.group(2).strip().replace('\n', ' ')
        q_text = re.sub(r'\s+', ' ', q_text)

        # Extract options
        options = {}
        for letter in 'ABCD':
            # Match "A. text" up to next option or Correct Answer
            opt_pat = rf'{letter}[.)\s]\s*(.+?)(?=\n[B-D][.)]\s|\nCorrect Answer|\nAnswer:|\Z)'
            om = re.search(opt_pat, block, re.DOTALL)
            if om:
                opt_text = om.group(1).strip().replace('\n', ' ')
                options[letter] = re.sub(r'\s+', ' ', opt_text)

        if len(options) < 2:
            continue  # skip malformed

        # Extract correct answer
        ans_match = re.search(r'Correct\s+Answer\s*[:\-]?\s*([A-D])', block, re.IGNORECASE)
        if not ans_match:
            ans_match = re.search(r'Answer\s*[:\-]?\s*([A-D])\b', block, re.IGNORECASE)
        if not ans_match:
            continue
        correct_letter = ans_match.group(1).upper()

        # Extract explanation
        exp_match = re.search(r'Explanation\s*[:\-]?\s*(.+)', block, re.DOTALL | re.IGNORECASE)
        explanation = None
        if exp_match:
            exp_text = exp_match.group(1).strip().replace('\n', ' ')
            explanation = re.sub(r'\s+', ' ', exp_text)
            # Trim if next question got attached
            explanation = re.sub(r'\s*\d{1,3}\.\s+.+$', '', explanation).strip()

        # Rebuild options list in order (fill in missing as best effort)
        opts_list = []
        for letter in 'ABCD':
            if letter in options:
                opts_list.append({"letter": letter, "text": options[letter]})

        if len(opts_list) < 2:
            continue

        questions.append({
            "num": q_num,
            "text": q_text,
            "subject": subject,
            "topic": current_topic,
            "year": year,
            "options": opts_list,
            "correct_letter": correct_letter,
            "explanation": explanation,
        })

    return questions

def main():
    os.makedirs(".agents/outputs", exist_ok=True)

    doc = fitz.open(PDF)
    total_pages = doc.page_count
    doc.close()
    print(f"Total pages: {total_pages}")

    # Only process pages that have questions (skip first 7 intro pages, stop at end)
    question_pages = [(i, PDF) for i in range(7, min(total_pages, 598))]
    print(f"Processing {len(question_pages)} pages with {multiprocessing.cpu_count()} CPUs...")

    all_questions = []
    done = 0
    batch_size = 20  # process in batches to show progress

    with multiprocessing.Pool(processes=multiprocessing.cpu_count()) as pool:
        for page_idx, text in pool.imap(ocr_page, question_pages, chunksize=4):
            subject = get_subject(page_idx)
            if not subject:
                done += 1
                continue
            qs = parse_questions(text, subject)
            all_questions.extend(qs)
            done += 1
            if done % 50 == 0:
                print(f"  {done}/{len(question_pages)} pages done, {len(all_questions)} questions so far")

    print(f"\nTotal extracted: {len(all_questions)} questions")

    # Deduplicate by (subject, question number, first 60 chars of text)
    seen = set()
    unique = []
    for q in all_questions:
        key = (q['subject'], q['num'], q['text'][:60])
        if key not in seen:
            seen.add(key)
            unique.append(q)
    print(f"After dedup: {len(unique)} unique questions")

    with open(".agents/outputs/questions.json", "w", encoding="utf-8") as f:
        json.dump(unique, f, ensure_ascii=False, indent=2)
    print("Saved to .agents/outputs/questions.json")

if __name__ == "__main__":
    main()
