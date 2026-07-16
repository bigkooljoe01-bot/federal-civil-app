import fitz
import pytesseract
from PIL import Image
import io

PDF = "attached_assets/fedcv-exams-google-format_1600_pdf.gdrive.vip_1784115872047.pdf"
doc = fitz.open(PDF)

# Render page 14 (index 13 = page 14) at 2x zoom for good OCR quality
# Table of contents says questions start at page 7 (index 6/7)
# Let's try page index 13 which should be an early question page
for page_idx in [8, 9, 13]:
    page = doc[page_idx]
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
    img = Image.open(io.BytesIO(pix.tobytes("png")))
    text = pytesseract.image_to_string(img)
    print(f"\n========= PAGE {page_idx+1} =========")
    print(text[:1500])

doc.close()
