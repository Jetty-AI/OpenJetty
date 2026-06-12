# OpenJetty

**Persistent AI memory for patients and doctors.** OpenJetty reads a patient's situation and lab
reports, builds a living **User Memory**, reasons it against each doctor's **Business Memory** to
**match** them (with a written *why*), **prepares** the patient for the visit, and powers a
**proxy chat** in the doctor's voice — and the memory keeps growing after every visit. Doctor
vertical, hackathon MVP.

> The innovation is the **memory layer**; matching, prep, and chat are extensions of it. Matching is
> Claude *reasoning over structured memory* — not keyword search.

## How it works (the 5-screen loop)

```
1. Upload story + lab PDFs → 2. See your Memory (+ the hidden lab trend)
        → 3. Answer smart follow-ups (completeness bar) → 4. Matched specialists, with WHY
        → 5. Prep pack → 6. Proxy chat → 7. Visit becomes memory (never start from zero)
```

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Next.js + React + Tailwind (5 screens) |
| Backend | FastAPI (Python) — 7 endpoints |
| AI | Claude **Fable 5** (`claude-fable-5`) — 6 engines (A1–A6) |
| Database | PostgreSQL + JSONB (in-memory to start) |
| PDF parsing | PyMuPDF |
| Deploy | Railway (backend) + Vercel (frontend) |

## Repository layout

```
OpenJetty/
├── README.md                ← you are here
├── handover-docs/           ← the full plan (read in this order)
│   ├── overview-for-founder.md   one-page overview
│   ├── architecture.md           ⭐ source of truth: data model + API contracts (§4/§5)
│   ├── build-specs.md            what gets built, per component
│   ├── implementation-guide.md   the phase-by-phase build plan
│   ├── prompts-playbook.md       copy-paste prompts to drive the build
│   ├── user-flow.md / business-flow.md   the two-sided product story
│   ├── claude-desktop-guide.md   building it from the Claude desktop app
│   ├── keys-and-setup.md         keys, accounts, env vars
│   └── deployment.md             going live
└── sample-data/             ← staged demo data (no scraping, no APIs)
    ├── businesses/               8 doctor records (architecture.md §4.5)
    └── patient/                  demo patient: 3 lab-report PDFs + situation text
```

## Getting started

The build is driven through Claude Code, phase by phase. Open `handover-docs/implementation-guide.md`
and follow Phase 0 → 5, or paste the prompts from `handover-docs/prompts-playbook.md`. Frontend and
backend are scaffolded during Phase 0; the sample data in `sample-data/` is already provided.

> **Status:** hackathon MVP. Out of scope: appointment booking, auth, payments, EMR, live data
> fetching. Sample business data is staged (hand-authored); in production it would come from public
> sources.
