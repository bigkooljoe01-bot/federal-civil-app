from pathlib import Path
import fitz

ASSET_DIR = Path("attached_assets")
OUT_DIR = Path(".agents/outputs/pdf_inspection")
OUT_DIR.mkdir(parents=True, exist_ok=True)

pdfs = sorted(ASSET_DIR.glob("*.pdf"))
for pdf_path in pdfs:
    doc = fitz.open(pdf_path)
    print(f"{pdf_path.name}\tpages={doc.page_count}\tmetadata={doc.metadata}")
    indexes = sorted(set([0, doc.page_count // 2, max(0, doc.page_count - 1)]))
    for index in indexes:
        page = doc[index]
        pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
        output = OUT_DIR / f"{pdf_path.stem[:36]}_page_{index + 1}.png"
        pix.save(output)
        text = page.get_text("text").strip().replace("\n", " ")
        print(f"  rendered={output} text_chars={len(text)} text_preview={text[:120]!r}")
    doc.close()