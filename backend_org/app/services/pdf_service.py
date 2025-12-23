import os
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

def generate_pdf(document, pdf_dir, filename):
    filepath = os.path.join(pdf_dir, filename)

    doc = SimpleDocTemplate(filepath, pagesize=A4)
    styles = getSampleStyleSheet()
    content = []

    title = (document.get("type") or "Document").upper()
    body = document.get("generatedText") or ""

    content.append(Paragraph(title, styles["Title"]))
    content.append(Spacer(1, 12))

    for block in body.split("\n\n"):
        content.append(Paragraph(block, styles["Normal"]))
        content.append(Spacer(1, 8))

    doc.build(content)
    return filepath

