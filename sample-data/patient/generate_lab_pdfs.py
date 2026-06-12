#!/usr/bin/env python3
"""Generate 3 realistic blood-test lab-report PDFs for the OpenJetty demo patient.

Story: ferritin 45 -> 32 -> 27 ng/mL over ~18 months, with a developing microcytic,
iron-deficiency picture (falling Hgb/MCV, rising RDW, dropping transferrin saturation)
and gently declining B12. Each report looks borderline-normal on its own; read together
they reveal a clear decline that three separate GPs missed.

Run:  python3 generate_lab_pdfs.py   (requires: pip install fpdf2)
"""
import os
from fpdf import FPDF
from fpdf.enums import XPos, YPos

OUT_DIR = os.path.dirname(os.path.abspath(__file__))

PATIENT = {
    "name": "Jordan A. Rivera",
    "dob": "1991-03-22",
    "sex": "Female",
    "mrn": "BV-0498217",
}

LAB = {
    "name": "BAYVIEW CLINICAL LABORATORIES",
    "addr": "1450 Harbor Blvd, San Francisco, CA 94109",
    "clia": "CLIA# 05D8842197   |   (415) 555-0142",
    "path": "Naomi Feldman, MD - Clinical Pathologist",
}

REPORTS = [
    {
        "idx": 0, "collected": "2024-08-12", "reported": "2024-08-13", "age": "33",
        "accession": "BV24-118734", "provider": "Alan Whitfield, MD - Family Medicine",
        "comment": "All values reviewed. No critical results flagged. Clinical correlation recommended.",
        "file": "01_blood-test_2024-08-12.pdf",
    },
    {
        "idx": 1, "collected": "2025-04-18", "reported": "2025-04-19", "age": "34",
        "accession": "BV25-094215", "provider": "Susan Delgado, MD - Family Medicine",
        "comment": "All values reviewed. No critical results flagged. Clinical correlation recommended.",
        "file": "02_blood-test_2025-04-18.pdf",
    },
    {
        "idx": 2, "collected": "2026-02-09", "reported": "2026-02-10", "age": "34",
        "accession": "BV26-027781", "provider": "Henry Cole, MD - Internal Medicine",
        "comment": "Low ferritin with microcytic indices noted. Suggest oral iron supplementation and "
                   "follow-up iron studies; correlate clinically.",
        "file": "03_blood-test_2026-02-09.pdf",
    },
]

# (test, [r1, r2, r3 values], [r1, r2, r3 flags], reference range, units)
SECTIONS = [
    ("COMPLETE BLOOD COUNT (CBC)", [
        ("WBC",              ["6.2", "5.9", "6.4"],    ["", "", ""],   "4.0 - 11.0",  "10^3/uL"),
        ("RBC",              ["4.52", "4.31", "4.08"], ["", "", "L"],  "4.20 - 5.40", "10^6/uL"),
        ("Hemoglobin",       ["13.2", "12.4", "11.6"], ["", "", "L"],  "12.0 - 15.5", "g/dL"),
        ("Hematocrit",       ["39.5", "37.2", "34.8"], ["", "", "L"],  "36.0 - 46.0", "%"),
        ("MCV",              ["88", "83", "78"],       ["", "", "L"],  "80 - 100",    "fL"),
        ("MCH",              ["29.0", "27.4", "25.3"], ["", "", "L"],  "27.0 - 33.0", "pg"),
        ("MCHC",             ["33.5", "33.1", "32.6"], ["", "", ""],   "32.0 - 36.0", "g/dL"),
        ("RDW",              ["13.2", "14.2", "15.9"], ["", "", "H"],  "11.5 - 14.5", "%"),
        ("Platelets",        ["285", "312", "364"],    ["", "", ""],   "150 - 400",   "10^3/uL"),
    ]),
    ("IRON STUDIES", [
        ("Serum Iron",       ["68", "54", "41"],       ["", "", "L"],  "50 - 170",    "ug/dL"),
        ("TIBC",             ["345", "372", "398"],    ["", "", ""],   "250 - 450",   "ug/dL"),
        ("Transferrin Sat.", ["20", "15", "10"],       ["", "L", "L"], "20 - 50",     "%"),
        ("Ferritin",         ["45", "32", "27"],       ["", "", "L"],  "30 - 400",    "ng/mL"),
    ]),
    ("VITAMINS", [
        ("Vitamin B12",      ["420", "338", "287"],    ["", "", ""],   "200 - 900",   "pg/mL"),
        ("Folate, Serum",    ["9.5", "8.8", "7.9"],    ["", "", ""],   "3.0 - 20.0",  "ng/mL"),
    ]),
]

# column widths (sum = 191mm, fits Letter width minus 12mm margins)
cT, cR, cF, cRef, cU = 56, 29, 16, 48, 42
TABLE_W = cT + cR + cF + cRef + cU


class LabPDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 15)
        self.set_text_color(20, 60, 110)
        self.cell(0, 7, LAB["name"], new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(90, 90, 90)
        self.cell(0, 4.5, LAB["addr"], new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.cell(0, 4.5, LAB["clia"], new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.ln(1.5)
        self.set_draw_color(20, 60, 110)
        self.set_line_width(0.5)
        y = self.get_y()
        self.line(12, y, 203, y)
        self.ln(2)
        self.set_text_color(0, 0, 0)
        self.set_font("Helvetica", "B", 11)
        self.cell(0, 6, "LABORATORY REPORT  -  HEMATOLOGY & CHEMISTRY",
                  new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="C")
        self.ln(1)

    def footer(self):
        self.set_y(-16)
        self.set_font("Helvetica", "I", 7.5)
        self.set_text_color(120, 120, 120)
        self.multi_cell(0, 3.6,
                        "SIMULATED laboratory report created for demonstration purposes only. "
                        "Does not represent a real patient or real laboratory results.",
                        align="C")
        self.set_text_color(0, 0, 0)


def demographics(pdf, rep):
    rows = [
        ("Patient Name:", PATIENT["name"],                       "Accession #:", rep["accession"]),
        ("DOB / Age:",    f'{PATIENT["dob"]}  ({rep["age"]} yrs)', "Collected:",  rep["collected"]),
        ("Sex:",          PATIENT["sex"],                        "Reported:",    rep["reported"]),
        ("MRN:",          PATIENT["mrn"],                        "Specimen:",    "Whole blood / Serum"),
        ("Provider:",     rep["provider"],                       "Status:",      "FINAL"),
    ]
    lw1, vw1, lw2, vw2 = 30, 65, 26, 70  # = 191
    for l1, v1, l2, v2 in rows:
        pdf.set_font("Helvetica", "B", 9); pdf.cell(lw1, 5.4, l1)
        pdf.set_font("Helvetica", "", 9);  pdf.cell(vw1, 5.4, v1)
        pdf.set_font("Helvetica", "B", 9); pdf.cell(lw2, 5.4, l2)
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(vw2, 5.4, v2, new_x=XPos.LMARGIN, new_y=YPos.NEXT)


def results_table(pdf, rep):
    i = rep["idx"]
    pdf.ln(3)
    # column header
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(225, 232, 240)
    pdf.set_draw_color(170, 170, 170)
    pdf.cell(cT, 7, "  TEST", border=1, fill=True)
    pdf.cell(cR, 7, "RESULT  ", border=1, fill=True, align="R")
    pdf.cell(cF, 7, "FLAG", border=1, fill=True, align="C")
    pdf.cell(cRef, 7, "REFERENCE RANGE", border=1, fill=True, align="C")
    pdf.cell(cU, 7, "UNITS", border=1, fill=True, align="C",
             new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    for section, rows in SECTIONS:
        pdf.set_font("Helvetica", "B", 8.5)
        pdf.set_fill_color(243, 243, 243)
        pdf.set_text_color(40, 40, 40)
        pdf.cell(TABLE_W, 6, "  " + section, border=1, fill=True,
                 new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_text_color(0, 0, 0)
        for test, vals, flags, ref, units in rows:
            val, flag = vals[i], flags[i]
            flagged = flag in ("L", "H")
            pdf.set_font("Helvetica", "", 9)
            pdf.cell(cT, 5.8, "  " + test, border=1)
            if flagged:
                pdf.set_text_color(200, 0, 0); pdf.set_font("Helvetica", "B", 9)
            pdf.cell(cR, 5.8, val + "  ", border=1, align="R")
            pdf.cell(cF, 5.8, flag, border=1, align="C")
            pdf.set_text_color(0, 0, 0); pdf.set_font("Helvetica", "", 9)
            pdf.cell(cRef, 5.8, ref, border=1, align="C")
            pdf.cell(cU, 5.8, units, border=1, align="C",
                     new_x=XPos.LMARGIN, new_y=YPos.NEXT)


def comment_block(pdf, rep):
    pdf.ln(3)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(0, 5, "COMMENTS", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_draw_color(170, 170, 170)
    pdf.multi_cell(TABLE_W, 5, rep["comment"], border=1)
    pdf.ln(2.5)
    pdf.set_font("Helvetica", "I", 8.5)
    pdf.set_text_color(90, 90, 90)
    pdf.multi_cell(0, 4.5, f'Electronically signed by {LAB["path"]} on {rep["reported"]}.')
    pdf.set_text_color(0, 0, 0)


def main():
    for rep in REPORTS:
        pdf = LabPDF(format="Letter")
        pdf.set_margins(12, 12, 12)
        pdf.set_auto_page_break(auto=True, margin=18)
        pdf.add_page()
        demographics(pdf, rep)
        results_table(pdf, rep)
        comment_block(pdf, rep)
        out = os.path.join(OUT_DIR, rep["file"])
        pdf.output(out)
        print("wrote", out)


if __name__ == "__main__":
    main()
