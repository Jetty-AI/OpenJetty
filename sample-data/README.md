# OpenJetty — Sample Data

All hand-authored demo data (staged — no scraping, no external APIs), split into the product's two
sides. Both are designed around **one demo story** so the match is obvious and explainable.

```
sample-data/
├── README.md
├── businesses/          ← BUSINESS side: 8 doctor records (architecture.md §4.5)
│   ├── dr-sarah-chen.json        (Hematology    — the right match)
│   ├── dr-marcus-okafor.json     (Gastroenterology)
│   ├── dr-linda-park.json        (Internal Medicine)
│   ├── dr-james-reed.json        (Endocrinology)
│   ├── dr-priya-nair.json        (Rheumatology)
│   ├── amena-hassan-rd.json      (Clinical Nutrition)
│   ├── dr-robert-tanaka.json     (Nephrology)
│   └── dr-elena-vasquez.json     (Cardiology)
└── patient/             ← USER side: what the demo patient uploads on Screen 1
    ├── patient-situation.txt              (the "Tell us what's going on" text)
    ├── 01_blood-test_2024-08-12.pdf       (ferritin 45)
    ├── 02_blood-test_2025-04-18.pdf       (ferritin 32)
    ├── 03_blood-test_2026-02-09.pdf       (ferritin 27)
    └── generate_lab_pdfs.py               (reproducible PDF generator)
```

> **Note on paths:** the docs reference a flat `sample-data/*.json`. Here the doctor records live in
> `sample-data/businesses/`, so the backend **seed step should read `sample-data/businesses/*.json`**.
> Patient PDFs are *not* seeded — they're uploaded live through `POST /upload` during the demo.

---

## The demo story (both sides built around this)

> *"Fatigued for 8 months. Three GPs said I'm fine. Ferritin dropped 45 → 32 → 27 over 18 months,
> B12 is declining, oral iron didn't help. I'm vegetarian. What's going on and who do I see?"*

The whole point: each lab report looks **borderline-normal alone**, but read **together over time**
they show a clear iron-deficiency decline three doctors missed — and the right specialist is a
hematologist who investigates *why* iron is low (malabsorption) rather than just prescribing more iron.

---

## USER side — `patient/`

Patient **Jordan A. Rivera**, 3 real PDF blood-test reports (different dates, different ordering GPs),
plus the situation text. The reports tell a single, internally consistent story:

| Marker | 2024-08 | 2025-04 | 2026-02 | Ref | Reads as |
|---|---|---|---|---|---|
| **Ferritin** (ng/mL) | 45 | 32 | **27 (L)** | 30–400 | iron stores draining |
| Hemoglobin (g/dL) | 13.2 | 12.4 | **11.6 (L)** | 12.0–15.5 | developing anemia |
| MCV (fL) | 88 | 83 | **78 (L)** | 80–100 | microcytic (iron-deficiency) |
| Transferrin Sat. (%) | 20 | **15 (L)** | **10 (L)** | 20–50 | classic iron deficiency |
| RDW (%) | 13.2 | 14.2 | **15.9 (H)** | 11.5–14.5 | anisocytosis |
| Vitamin B12 (pg/mL) | 420 | 338 | 287 | 200–900 | trending down (vegetarian) |

Each PDF is a styled lab printout (letterhead, demographics, flagged out-of-range values, pathologist
sign-off) and is **text-extractable**, so PyMuPDF + Engine A1 can read it. **Demo:** paste
`patient-situation.txt` into the situation box and upload the 3 PDFs in date order.

> To regenerate or tweak values: `cd patient && python3 generate_lab_pdfs.py` (needs `pip install fpdf2`).

---

## BUSINESS side — `businesses/`

8 doctor records in the §4.5 shape, seeded via `/ingest/business` → Engine A2 builds each into a
structured **Business Memory**. Tuned to produce a believable, explainable ranking:

| File | Doctor | Specialty | Demo fit | Why |
|---|---|---|---|---|
| `dr-sarah-chen.json` | Dr. Sarah Chen | **Hematology** | 🟢 **Best (hero)** | Refractory iron deficiency, malabsorption, oral-iron failure, IV iron, reads ferritin trends — exactly this story |
| `dr-marcus-okafor.json` | Dr. Marcus Okafor | **Gastroenterology** | 🟡 Secondary (hero) | Finds the *cause* (celiac/malabsorption) but doesn't manage the anemia |
| `dr-linda-park.json` | Dr. Linda Park | **Internal Medicine** | 🟠 Weak (hero) | Generalist who refers out — the kind of doctor the patient already saw |
| `dr-james-reed.json` | Dr. James Reed | Endocrinology | 🟠 Plausible alt | Fatigue → thyroid is a fair rule-out, but not the iron story |
| `dr-priya-nair.json` | Dr. Priya Nair | Rheumatology | 🟠 Plausible alt | Autoimmune fatigue, but no inflammatory features here |
| `amena-hassan-rd.json` | Amena Hassan, RD | Clinical Nutrition | 🔵 Supportive | Vegetarian iron/B12 support, but can't diagnose or treat |
| `dr-robert-tanaka.json` | Dr. Robert Tanaka | Nephrology | 🔴 Off-target | Anemia of kidney disease — wrong mechanism, no renal signs |
| `dr-elena-vasquez.json` | Dr. Elena Vasquez | Cardiology | 🔴 Off-target | A clear non-match — proves the matcher discriminates |

**Expected ranking:** Chen (Hematology) on top with a user-referencing explanation, Okafor close
behind, the rest trailing, Tanaka/Vasquez clearly at the bottom. Chen, Okafor, and Park are the 3
sharply distinct **hero** doctors (`build-specs.md` §5); the other five give the list realistic depth.

### Record shape (§4.5)
```json
{
  "business_id": "kebab-case-id", "name": "Dr. ...", "specialty": "...",
  "location": "City, ST", "rating": 4.x, "review_count": 0,
  "reviews": ["...", "..."],
  "profile_text": "<bio / specialty blurb>",
  "guideline_text": "<clinical-protocol blurb — A2 distills this into 'protocols'>",
  "source": ["sample"]
}
```

> To add a doctor: copy any file, keep the §4.5 field names, give it a unique `business_id`, and write
> a `guideline_text` that reads like a real clinical protocol.

---

## How the code uses this
1. **Seed (startup):** read `businesses/*.json` → `POST /ingest/business` → A2 → Business Memory.
2. **Live (demo):** user pastes `patient/patient-situation.txt` + uploads the 3 `patient/*.pdf` →
   `POST /upload` → PyMuPDF → A1 → User Memory (ferritin 45→32→27 captured).
3. **Match:** A3 reasons over User Memory + all Business Memories → Dr. Chen ranks #1 with a "why".
