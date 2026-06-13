"""Generate a mock I-797C 'Notice of Approval' for an I-140, for the demo.

Not a real government document — staged data for the OpenJetty document demo.
Run: python make_i140.py  (writes the PDF into frontend/public)
"""
import os

import fitz  # PyMuPDF

OUT = os.path.join(
    os.path.dirname(__file__), "..", "frontend", "public", "sample-i140-approval.pdf"
)

doc = fitz.open()
page = doc.new_page(width=612, height=792)  # US Letter

ink = (0.1, 0.12, 0.18)
muted = (0.35, 0.38, 0.45)
brand = (0.0, 0.2, 0.5)


def text(x, y, s, size=10, color=ink, font="helv"):
    page.insert_text((x, y), s, fontsize=size, color=color, fontname=font)


# Header
text(54, 60, "U.S. Department of Homeland Security", 11, muted)
text(54, 76, "U.S. Citizenship and Immigration Services", 11, muted)
text(54, 108, "I-797C, Notice of Action", 18, brand, font="hebo")
page.draw_line(fitz.Point(54, 122), fitz.Point(558, 122), color=muted, width=0.8)

# Notice meta (top row)
text(54, 150, "NOTICE TYPE", 8, muted, font="hebo")
text(54, 166, "Approval Notice", 12, ink, font="hebo")
text(330, 150, "NOTICE DATE", 8, muted, font="hebo")
text(330, 166, "March 10, 2023", 12, ink)

text(54, 196, "RECEIPT NUMBER", 8, muted, font="hebo")
text(54, 212, "WAC-22-901-54321", 11, ink)
text(330, 196, "CASE TYPE", 8, muted, font="hebo")
text(330, 212, "I-140 — Immigrant Petition for Alien Worker", 11, ink)

page.draw_line(fitz.Point(54, 232), fitz.Point(558, 232), color=(0.85, 0.87, 0.9), width=0.6)

# Body fields
rows = [
    ("PETITIONER", "TECH CORP INC"),
    ("BENEFICIARY", "DEMO USER"),
    ("CLASSIFICATION", "EB-2 (Member of the Professions Holding an Advanced Degree)"),
    ("PRIORITY DATE", "January 15, 2022"),
    ("PETITION VALIDITY", "Approved"),
]
y = 262
for label, value in rows:
    text(54, y, label, 8, muted, font="hebo")
    text(200, y, value, 11, ink)
    y += 30

page.draw_line(fitz.Point(54, y + 4), fitz.Point(558, y + 4), color=(0.85, 0.87, 0.9), width=0.6)

# Approval statement
y += 34
body = (
    "The above petition has been approved. The petition indicates that the person for whom "
    "you are petitioning is inside the United States and will apply for adjustment of status. "
    "USCIS has approved the Form I-140 immigrant petition filed on behalf of the beneficiary "
    "named above with the priority date shown."
)
page.insert_textbox(
    fitz.Rect(54, y, 558, y + 90), body, fontsize=10.5, color=ink, fontname="helv"
)

# Footer
page.draw_line(fitz.Point(54, 720), fitz.Point(558, 720), color=muted, width=0.8)
text(54, 740, "MOCK DOCUMENT — staged sample data for the OpenJetty demo. Not a government record.", 8, muted)

doc.save(os.path.abspath(OUT))
print("wrote", os.path.abspath(OUT))
