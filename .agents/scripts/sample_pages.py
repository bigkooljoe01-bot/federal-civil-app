import fitz, os

PDF = "attached_assets/fedcv-exams-google-format_1600_pdf.gdrive.vip_1784115872047.pdf"
doc = fitz.open(PDF)
os.makedirs(".agents/outputs", exist_ok=True)

# Render pages 4–10 to find question start and format
for i in [4, 5, 6, 7, 8, 9, 14, 30, 60]:
    if i < doc.page_count:
        page = doc[i]
        pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5))
        pix.save(f".agents/outputs/page_{i+1:03d}.png")

doc.close()
print("Done")
