import fitz
import json

PDF = "attached_assets/fedcv-exams-google-format_1600_pdf.gdrive.vip_1784115872047.pdf"
doc = fitz.open(PDF)

print(f"Pages: {doc.page_count}")
print(f"Metadata: {doc.metadata}")

# Render first 3 pages
import os
os.makedirs(".agents/outputs", exist_ok=True)

for i in range(min(3, doc.page_count)):
    page = doc[i]
    pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5))
    pix.save(f".agents/outputs/page_{i+1:03d}.png")
    print(f"\n--- Page {i+1} text ---")
    print(page.get_text())

doc.close()
