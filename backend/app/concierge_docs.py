"""Builds the 3 mock intake documents for each attorney's AI concierge.

Generated from the attorney's profile + concierge config so each firm's docs
read differently. These are the ONLY source the concierge may answer from.
"""
from __future__ import annotations


def _intake_faq(a: dict) -> str:
    c = a["concierge"]
    consult = (
        "Yes — we offer a free 20-minute initial phone or video consultation."
        if c["free_consult"]
        else f"We offer a paid initial consultation (${c['consult_fee']} for 45 minutes). "
        "The fee is credited toward your case if you decide to retain us."
    )
    return f"""INTAKE FAQ — {a['firm']}

Q: Do you offer free consultations?
A: {consult}

Q: How do I get started / book a consultation?
A: Reach out through our intake form or this concierge to request a consultation.
   We respond {c['response_time']}.

Q: What documents should I bring to my consultation?
A: Please have ready: your passport, most recent I-94, your current visa or status
   approval notice (e.g. I-797), any prior petitions or approval notices (I-140, PERM),
   and any letters or notices you've received from USCIS.

Q: What languages does the office serve?
A: We assist clients in {', '.join(a['languages'])}.

Q: What kinds of cases do you handle?
A: Our focus is {a['focus'].lower()}. Common matters include {', '.join(a['specialties'])}.

Q: Do you guarantee a particular outcome?
A: No attorney can guarantee a government decision. We give you an honest assessment
   and the strongest possible filing.
"""


def _fee_schedule(a: dict) -> str:
    c = a["concierge"]
    lines = [f"FEE SCHEDULE — {a['firm']}", ""]
    if c["free_consult"]:
        lines.append("Initial consultation: FREE (20 minutes).")
    else:
        lines.append(
            f"Initial consultation: ${c['consult_fee']} (45 minutes), "
            "credited toward your case if you retain us."
        )
    lines.append(f"Hourly rate: ${c['hourly_rate']}/hour for work billed hourly.")
    lines.append("")
    lines.append(
        "Flat fees for common matters (attorney fees only — government filing "
        "fees are separate and paid to USCIS):"
    )
    for service, price in c["flat_fees"].items():
        lines.append(f"  - {service}: ${price:,}")
    lines.append("")
    lines.append(f"Payment: {c['payment']}")
    return "\n".join(lines)


def _what_to_expect(a: dict) -> str:
    c = a["concierge"]
    return f"""WHAT TO EXPECT — {a['firm']}

1. Consultation. We learn your goals and timeline and give you an honest read on your
   options. {"This first consult is free." if c["free_consult"] else "This is a paid consult, credited if you retain us."}

2. Engagement. If we're a fit, you receive a written engagement agreement with a clear
   flat fee or hourly estimate before any work begins. No surprise bills.

3. Document collection. We send you a tailored checklist and securely collect your
   documents.

4. Preparation & filing. We prepare your petition or application, review it with you,
   and file it. We keep copies of everything.

5. Communication. You'll have a point of contact and can expect responses
   {c['response_time']}. We proactively flag deadlines and any USCIS updates on your case.

6. After filing. We monitor your case, respond to any Requests for Evidence, and let you
   know what to watch for next.
"""


def build_docs(a: dict) -> list[dict]:
    """Return the 3 intake documents as {title, content}."""
    return [
        {"title": "Intake FAQ", "content": _intake_faq(a)},
        {"title": "Fee Schedule", "content": _fee_schedule(a)},
        {"title": "What to Expect", "content": _what_to_expect(a)},
    ]


def build_docs_text(a: dict) -> str:
    """All 3 documents concatenated, for the concierge system prompt."""
    return "\n\n".join(f"--- {d['title']} ---\n{d['content']}" for d in build_docs(a))
