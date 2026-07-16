"""
Batch-based OCR extraction with checkpointing.
Usage: python extract_batch.py <start_page> <end_page>
Pages are 0-based PDF page indices.
"""

import fitz
import pytesseract
from PIL import Image
import io
import re
import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

PDF = "attached_assets/fedcv-exams-google-format_1600_pdf.gdrive.vip_1784207523734.pdf"
CHECKPOINT_DIR = ".agents/outputs/pages"
os.makedirs(CHECKPOINT_DIR, exist_ok=True)

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
    txt_path = f"{CHECKPOINT_DIR}/page_{page_idx:04d}.txt"
    # Skip if already done
    if os.path.exists(txt_path):
        with open(txt_path, encoding="utf-8") as f:
            return page_idx, f.read()
    try:
        doc = fitz.open(pdf_path)
        page = doc[page_idx]
        # 1.5x zoom: good balance of speed vs quality
        pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5))
        doc.close()
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        # oem 1 = LSTM only (faster); psm 6 = uniform block text
        text = pytesseract.image_to_string(img, config="--oem 1 --psm 6")
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(text)
        return page_idx, text
    except Exception as e:
        print(f"  ERROR page {page_idx}: {e}", flush=True)
        return page_idx, ""

def parse_questions(text, subject, page_idx):
    questions = []
    # Clean OCR artefacts
    text = re.sub(r'[\.\s]*New Track Publication\s*', '', text)
    text = re.sub(r'[✅✓☑]\s*', '', text)
    text = re.sub(r'\r\n', '\n', text)
    text = re.sub(r'\n{3,}', '\n\n', text)

    # Split on question number at start of line
    blocks = re.split(r'\n(?=\d{1,3}\.\s+[A-Z])', text)

    for block in blocks:
        block = block.strip()
        if not block:
            continue

        # Question number + text up to first option
        q_match = re.match(r'^(\d{1,3})\.\s+(.+?)(?=\n[A-D][.)]\s)', block, re.DOTALL)
        if not q_match:
            # Try without lookahead
            q_match = re.match(r'^(\d{1,3})\.\s+(.+)', block, re.DOTALL)
            if not q_match:
                continue

        q_num = int(q_match.group(1))
        if q_num < 1 or q_num > 9999:
            continue

        q_text = re.sub(r'\s+', ' ', q_match.group(2).split('\n')[0]).strip()
        if len(q_text) < 8:
            continue

        # Extract options A–D
        options = {}
        for letter in 'ABCD':
            pat = rf'\n{letter}[.)]\s+(.+?)(?=\n[A-D][.)]\s|\nCorrect|\nAnswer|\Z)'
            m = re.search(pat, block, re.DOTALL)
            if m:
                opt_text = re.sub(r'\s+', ' ', m.group(1)).strip()
                # Drop trailing footnote numbers and OCR noise
                opt_text = re.sub(r'\s*\d+$', '', opt_text).strip()
                if opt_text:
                    options[letter] = opt_text

        if len(options) < 2:
            continue

        # Correct answer
        ans_m = re.search(r'Correct\s+Answer\s*[:\-]?\s*([A-D])', block, re.IGNORECASE)
        if not ans_m:
            ans_m = re.search(r'Answer\s*[:\-]\s*([A-D])\b', block, re.IGNORECASE)
        if not ans_m:
            continue
        correct = ans_m.group(1).upper()
        if correct not in options and len(options) > 0:
            correct = list(options.keys())[0]  # fallback

        # Explanation
        exp_m = re.search(r'Explanation\s*[:\-]?\s*(.+)', block, re.DOTALL | re.IGNORECASE)
        explanation = None
        if exp_m:
            exp_text = re.sub(r'\s+', ' ', exp_m.group(1).strip())
            # Trim if next question bled in
            exp_text = re.sub(r'\s*\d{1,3}\.\s+[A-Z].+$', '', exp_text).strip()
            explanation = exp_text if len(exp_text) > 5 else None

        opts_list = [{"letter": l, "text": options[l]} for l in 'ABCD' if l in options]

        questions.append({
            "num": q_num,
            "text": q_text,
            "subject": subject,
            "year": 2025,
            "options": opts_list,
            "correct_letter": correct,
            "explanation": explanation,
            "page_idx": page_idx,
        })

    return questions

def main():
    start = int(sys.argv[1]) if len(sys.argv) > 1 else 7
    end = int(sys.argv[2]) if len(sys.argv) > 2 else 200

    doc = fitz.open(PDF)
    total = doc.page_count
    doc.close()
    end = min(end, total - 1)

    pages = [(i, PDF) for i in range(start, end + 1) if get_subject(i)]
    print(f"Processing pages {start}–{end} ({len(pages)} question pages)...", flush=True)

    all_questions = []
    done = 0

    with ThreadPoolExecutor(max_workers=4) as ex:
        futures = {ex.submit(ocr_page, args): args[0] for args in pages}
        for future in as_completed(futures):
            page_idx, text = future.result()
            subj = get_subject(page_idx)
            if subj and text.strip():
                qs = parse_questions(text, subj, page_idx)
                all_questions.extend(qs)
            done += 1
            if done % 30 == 0 or done == len(pages):
                print(f"  {done}/{len(pages)} done | {len(all_questions)} questions", flush=True)

    # Deduplicate
    seen = set()
    unique = []
    for q in all_questions:
        key = (q['subject'], q['num'], q['text'][:50])
        if key not in seen:
            seen.add(key)
            unique.append(q)

    out_file = f".agents/outputs/questions_{start}_{end}.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(unique, f, ensure_ascii=False, indent=2)
    print(f"\nSaved {len(unique)} unique questions → {out_file}", flush=True)
    return out_file

if __name__ == "__main__":
    main()
