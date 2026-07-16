import fitz

PDF = "attached_assets/fedcv-exams-google-format_1600_pdf.gdrive.vip_1784115872047.pdf"
doc = fitz.open(PDF)

# Extract the embedded JPEG from page 14 (first real question page)
page = doc[14]
imgs = page.get_images(full=True)
# The first image on each page IS the page itself
xref = imgs[0][0]
img_data = doc.extract_image(xref)
print(f"Image ext: {img_data['ext']}, size: {len(img_data['image'])} bytes")

with open(".agents/outputs/page14_img.jpg", "wb") as f:
    f.write(img_data["image"])

doc.close()
print("Saved page14_img.jpg")
