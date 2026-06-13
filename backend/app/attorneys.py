"""Hardcoded attorney roster for the demo.

Staged sample data (no real directory / API). Each attorney has a distinct
focus so Claude's matching is meaningful across different case types.
"""
from __future__ import annotations

ATTORNEYS: list[dict] = [
    {
        "id": "priya-sharma",
        "name": "Priya Sharma",
        "firm": "Sharma Immigration Law",
        "location": "San Francisco, CA",
        "focus": "Employment-based green cards and the India/China backlog",
        "specialties": ["EB-1", "EB-2", "EB-3", "PERM", "I-485 strategy"],
        "experience_years": 14,
        "languages": ["English", "Hindi", "Punjabi"],
        "blurb": "Guides H-1B professionals from PERM through adjustment, with deep "
        "experience navigating retrogression and priority-date strategy for "
        "India- and China-born applicants.",
        "concierge": {
            "free_consult": True,
            "consult_fee": None,
            "hourly_rate": 380,
            "flat_fees": {
                "PERM labor certification": 4500,
                "I-140 petition": 3000,
                "I-485 adjustment (principal applicant)": 3500,
            },
            "response_time": "within 1 business day",
            "payment": "Flat fees are split into two installments. We accept "
            "credit cards, ACH, and wire transfer.",
        },
    },
    {
        "id": "david-chen",
        "name": "David Chen",
        "firm": "Chen & Partners",
        "location": "San Francisco, CA",
        "focus": "Work visas for tech and startups (H-1B, L-1, O-1)",
        "specialties": ["H-1B", "L-1", "O-1", "Cap-gap", "H-1B transfers"],
        "experience_years": 11,
        "languages": ["English", "Mandarin"],
        "blurb": "Represents engineers and founders on nonimmigrant work visas, "
        "including transfers, extensions, and tricky cap-gap timing.",
        "concierge": {
            "free_consult": False,
            "consult_fee": 150,
            "hourly_rate": 350,
            "flat_fees": {
                "H-1B cap petition": 3000,
                "H-1B transfer / extension": 2500,
                "O-1 petition": 6000,
            },
            "response_time": "the same business day for urgent matters",
            "payment": "Consultation fee is credited toward your case if you "
            "retain us. We accept credit cards and ACH.",
        },
    },
    {
        "id": "robert-tanaka",
        "name": "Robert Tanaka",
        "firm": "Tanaka Law Group",
        "location": "San Francisco, CA",
        "focus": "Complex multi-factor cases, AC21 portability, and RFEs",
        "specialties": ["AC21 portability", "RFE response", "I-140", "Job changes"],
        "experience_years": 19,
        "languages": ["English", "Japanese"],
        "blurb": "Handles the messy in-between cases — job changes mid-green-card, "
        "I-140 portability, withdrawn petitions, and Requests for Evidence.",
        "concierge": {
            "free_consult": True,
            "consult_fee": None,
            "hourly_rate": 420,
            "flat_fees": {
                "RFE response": 2500,
                "AC21 portability (Supplement J)": 1500,
                "I-140 with PERM": 7500,
            },
            "response_time": "within 1 business day",
            "payment": "Flat fees are due in two installments; complex matters "
            "may be billed hourly against a retainer. Cards and ACH accepted.",
        },
    },
    {
        "id": "maria-gonzalez",
        "name": "Maria Gonzalez",
        "firm": "Gonzalez Family Immigration",
        "location": "San Francisco, CA",
        "focus": "Family-based immigration and marriage green cards",
        "specialties": ["Marriage GC", "Adjustment of status", "I-130", "K-1 visas"],
        "experience_years": 16,
        "languages": ["English", "Spanish"],
        "blurb": "Focuses on family petitions, spousal green cards, and consular "
        "processing for relatives.",
        "concierge": {
            "free_consult": True,
            "consult_fee": None,
            "hourly_rate": 320,
            "flat_fees": {
                "Marriage green card (I-130 + I-485)": 4500,
                "K-1 fiancé(e) visa": 3500,
                "Naturalization (N-400)": 1500,
            },
            "response_time": "within 1–2 business days",
            "payment": "Flat fees in installments; cards, ACH, and payment plans "
            "available on request.",
        },
    },
    {
        "id": "sarah-kim",
        "name": "Sarah Kim",
        "firm": "Kim Student & Scholar Law",
        "location": "San Francisco, CA",
        "focus": "Students and early-career: F-1, OPT/STEM, change of status",
        "specialties": ["F-1", "OPT", "STEM OPT", "Change of status", "H-1B lottery"],
        "experience_years": 9,
        "languages": ["English", "Korean"],
        "blurb": "Advises students and new grads on OPT, STEM extensions, and the "
        "jump from F-1 to H-1B or other work status.",
        "concierge": {
            "free_consult": False,
            "consult_fee": 100,
            "hourly_rate": 300,
            "flat_fees": {
                "STEM OPT extension": 1200,
                "Change of status": 1800,
                "H-1B cap petition": 2800,
            },
            "response_time": "within 1 business day",
            "payment": "Student-friendly: the $100 consult is credited if you "
            "retain us, and flat fees can be paid in installments.",
        },
    },
    {
        "id": "james-okafor",
        "name": "James Okafor",
        "firm": "Okafor Humanitarian Law",
        "location": "San Francisco, CA",
        "focus": "Humanitarian relief: asylum, U/T visas, removal defense",
        "specialties": ["Asylum", "U visa", "T visa", "Removal defense"],
        "experience_years": 13,
        "languages": ["English", "French", "Yoruba"],
        "blurb": "Represents people seeking protection — asylum, humanitarian "
        "visas, and defense in removal proceedings.",
        "concierge": {
            "free_consult": True,
            "consult_fee": None,
            "hourly_rate": 350,
            "flat_fees": {
                "Affirmative asylum (I-589)": 6000,
                "U visa petition": 5000,
                "T visa petition": 5000,
            },
            "response_time": "within 1 business day (sooner if you are in "
            "detention or have a court date)",
            "payment": "Sliding-scale fees and payment plans are available; some "
            "matters may qualify for reduced or pro bono representation.",
        },
    },
]

_BY_ID = {a["id"]: a for a in ATTORNEYS}


def attorney_by_id(attorney_id: str) -> dict | None:
    return _BY_ID.get(attorney_id)
