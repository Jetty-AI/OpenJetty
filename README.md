# OpenJetty — Immigration Navigator

Describe your immigration situation in plain English. OpenJetty reasons across
**live USCIS data**, tells you where you stand, and what to do next.

See [`idea-docs/`](idea-docs/) for the product brief and test scenarios.

## Project layout

```
OpenJetty/
├── backend/    FastAPI + Anthropic SDK (web_search) — the reasoning API
├── frontend/   Next.js + React + Tailwind — the UI
└── idea-docs/  product brief + 50 test scenarios
```

## Run it locally

**Backend** (terminal 1):
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # add your ANTHROPIC_API_KEY
uvicorn app.main:app --reload --port 8000
```

**Frontend** (terminal 2):
```bash
cd frontend
npm install
npm run dev                 # http://localhost:3000
```

The home page shows a **Backend connected** badge when the API is reachable.

## Build phases

- **Phase 0 — Foundation** ✅ FastAPI `/health` + Next.js shell, wired together
- **Phase 1 — Analyze** — text → streamed reasoning → structured answer
- **Phase 2 — Live data** — visa bulletin / processing times via web_search, with citations
- **Phase 3 — Documents** — upload + cross-reference, flag discrepancies
- **Phase 4 — Attorney match** — Claude ranks specialists with a why
- **Phase 5 — Concierge** — per-attorney chat grounded in their docs
- **Phase 6 — Polish + deploy** — responsive, Railway + Vercel
