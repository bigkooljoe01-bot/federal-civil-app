import fitz

PDF = "attached_assets/fedcv-exams-google-format_1600_pdf.gdrive.vip_1784115872047.pdf"
doc = fitz.open(PDF)

# Try various text extraction modes on page 14 (first question page)
page = doc[14]
print("=== rawdict blocks ===")
d = page.get_text("rawdict")
for block in d["blocks"]:
    print(block)

print("\n=== images on page 14 ===")
imgs = page.get_images(full=True)
print(f"Images: {len(imgs)}")
for img in imgs[:3]:
    print(img)

doc.close()
