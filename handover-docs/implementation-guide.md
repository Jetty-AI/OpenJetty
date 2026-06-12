# OpenJetty — Implementation Guide (Phase Plan)

> **How to use:** upload these **three files** to Claude Code — `architecture.md` (the contracts),
> `build-specs.md` (the detail), and this guide (the phase plan) — and say:
> *"Build OpenJetty following implementation-guide.md. Go phase by phase, verify each phase before
> moving to the next."*
>
> Claude has the full context from the three docs and implements autonomously, phase by phase.

---

## Ground rules (Claude follows these throughout)

- **Build in phase order.** Finish a phase's **✅ Verify** before starting the next.
- **Demo-minimum first:** the simplest version that works end-to-end, then add depth.
- **Build against the contracts.** All data shapes and endpoints are fixed in `architecture.md`
  §4 / §5 — never change them mid-build. Use mock JSON wherever a real piece isn't ready yet.
- **Stack:** Next.js + Tailwind (frontend) · FastAPI (backend) · PostgreSQL + JSONB (in-memory is
  fine to start) · PyMuPDF (PDF) · Claude **Fable 5** (`claude-fable-5`) · hand-authored sample
  business data (no scraping/APIs) · files on local disk (no S3).

### Full product coverage (nothing is skipped)
| | Piece | Built in |
|---|---|---|
| 7 endpoints | `/upload`, `/intake/answer`, `/memory/{id}`, `/match`, `/prep`, `/proxy/chat`, `/ingest/business` | Phases 1–4 |
| 6 engines | A1 User Memory · A2 Business Memory · A3 Matching · A4 Prep · A5 Proxy Chat · A6 Follow-up | Phases 1–4 |
| 5 screens | Upload · Memory+Follow-ups · Matches · Prep · Proxy Chat | Phases 1–4 |
| Memory | persistent, merges over time, updates after visits | Phases 1, 4 |

---

## The build at a glance

```
Phase 0  Setup            → both stacks run, frontend ↔ backend connected
Phase 1  Memory loop      → upload PDF → User Memory built + stored → shown on screen   ← first demo
Phase 2  Business + Match  → sample doctors → Business Memory → Claude match → Matches screen
Phase 3  Prep + Chat       → prep package + AI proxy chat (streamed)
Phase 4  Follow-ups        → completeness meter + follow-up questions + memory-after-visit
Phase 5  Deploy            → push repo, deploy backend + frontend (simple, linear)
```

Each phase is a working slice. After Phase 1 there is already something to demo.

---

## Phase 0 — Setup

**Goal:** both stacks run locally and the frontend can reach the backend.

**Build:**
- Scaffold a monorepo: `frontend/` (Next.js + Tailwind, App Router), `backend/` (FastAPI with a
  `/health` route returning `{status:'ok'}` and CORS enabled), and `sample-data/` (already
  populated — `businesses/` doctor JSON records + `patient/` demo upload PDFs).
- Backend deps: fastapi, uvicorn[standard], anthropic, psycopg2-binary, python-multipart,
  python-dotenv, pydantic, PyMuPDF. Create `.env.example` with `ANTHROPIC_API_KEY`,
  `CLAUDE_MODEL=claude-fable-5`, `DATABASE_URL`.
- Frontend: add `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`) + a small API client that
  shows backend health on the home page.
- Build one **shared Claude client** (`backend/ai/claude_client.py`) with `structured(prompt, schema)`
  for JSON and `stream(prompt)` for chat, plus retry. Every engine uses this.

**✅ Verify:** `/health` returns ok · home page shows "backend: ok" with no CORS error · a trivial
`structured(...)` call returns valid JSON (once the API key is set).

---

## Phase 1 — The memory loop (build first)

**Goal:** user submits a situation + uploads a blood-test PDF → Claude builds **User Memory** → it's
stored → it renders on screen with the lab trend captured. First real demo moment.

**Build (in order):**
1. **Engine A1 — User Memory Builder** (`backend/ai/a1_user_memory.py`):
   `build_user_memory(text, existing_memory)` → User Memory (§4.1). Extracts conditions, symptoms,
   timeline, medications, treatments; **quantifies lab trends over time** ("ferritin 45→32→27");
   **merges** into existing memory instead of overwriting.
2. **Backend `/upload`** (§5): accept PDF + user_id → save raw file to disk (Hybrid Memory Layer 1) →
   extract text with PyMuPDF → load existing memory → call A1 → store → return updated memory.
   Add `GET /memory/{user_id}`. Use an in-memory store for now.
3. **Frontend — Screen 1 (Upload)** and **Screen 2 (Memory):** Upload = situation textarea +
   multi-PDF upload → `/upload`, with a "Claude is analyzing…" loading state. Memory = render the
   User Memory (§4.1) cleanly and highlight the lab trend.

**✅ Verify:** uploading the 3 sample PDFs shows merged memory with the declining ferritin/B12 trend;
re-uploading adds to memory, doesn't reset it.

---

## Phase 2 — Business data + Matching

**Goal:** sample doctor data becomes **Business Memory**, and Claude ranks doctors for the user with
a written *why-this-fits* explanation.

**Build (in order):**
1. **Sample business data** (`sample-data/businesses/*.json` — ✅ already provided, 8 doctors): realistic doctor records in the
   **Raw business record** shape (§4.5) — name, rating, sample reviews, a written `profile_text`, and
   a written `guideline_text` (the doctor's "protocols"). No scraping, no APIs. Make the 3 **hero**
   doctors distinct: a hematologist for iron deficiency/malabsorption (the right match for the
   ferritin story) plus clearly weaker-fit specialties.
2. **Engine A2 — Business Memory Builder** (`backend/ai/a2_business_memory.py`):
   `build_business_memory(raw_record)` → Business Memory (§4.2). Structures specialties,
   conditions_treated, treatment_philosophy, expertise_keywords, faqs, and **protocols** (from the
   `guideline_text`).
3. **Engine A3 — Matching** (`backend/ai/a3_match.py`): `match(user_memory, business_memories)` →
   Match result (§4.3): ranked matches with score, confidence, and a **why-fit explanation that
   references the user's real details**. Reasoning over both memories — not keyword search.
4. **Backend** `POST /ingest/business` (calls A2, stores Business Memory) + `POST /match` (loads user
   + all business memories, calls A3). Seed step ingests `sample-data/businesses/*.json` on startup.
5. **Frontend — Screen 3 (Matches):** cards with name, specialty, rating, score, and the why-fit
   explanation → `/match`; ranked by score; clicking a card selects that doctor for later screens.

**✅ Verify:** after upload, Matches shows ranked doctors (hematologist on top for the iron story),
each with a specific, user-referencing reason.

---

## Phase 3 — Prep + Proxy Chat

**Goal:** a pre-visit prep package, and a streamed chat that answers *as the doctor*.

**Build (in order):**
1. **Engine A4 — Prep** (`backend/ai/a4_prep.py`): `prep(user_memory, business_memory)` → Prep
   package (§4.4): situation_summary, questions_to_ask, documents_to_bring, tests_to_discuss.
2. **Engine A5 — Proxy Chat** (`backend/ai/a5_proxy_chat.py`):
   `proxy_chat(business_memory, user_memory, history, message)` → **streamed** reply in the doctor's
   voice, grounded in Business Memory, using User Memory so the patient never repeats themselves. If
   a question is outside the doctor's knowledge, it says it'll flag it for the visit — no making
   things up.
3. **Backend** `POST /prep` (A4) + `POST /proxy/chat` (A5, **streamed**, appends to a conversation
   store keyed by user_id + business_id).
4. **Frontend — Screen 4 (Prep)** renders the package (§4.4); **Screen 5 (Proxy Chat)** "Talk to
   Dr. Chen" renders the streamed reply token by token.

**✅ Verify:** open a match → tailored Prep package → chat with the proxy; replies stream in and
reference the user's history and the doctor's expertise.

---

## Phase 4 — Follow-ups, completeness & memory-after-visit

**Goal:** Claude finds gaps and asks targeted questions, a completeness bar shows readiness, and
post-visit chat updates memory.

**Build (in order):**
1. **Engine A6 — Follow-up** (`backend/ai/a6_followup.py`): `follow_up(user_memory)` →
   `{completeness:0-100, missing:[], questions:[]}`. Estimates completeness (drives a **70% readiness
   bar**), lists gaps, generates targeted questions (how long symptoms existed, iron supplements
   tried, vegetarian, digestive symptoms, family history, current medications).
2. **Backend** `POST /intake/answer`: feed answers through A1 (merge), recompute completeness via A6.
   Confirm **memory-after-appointments**: a chat line like "my doctor recommended celiac testing"
   runs A1 and updates timeline / pending_followups / recommended_next_steps (§7).
3. **Frontend — Screen 2 additions:** a **completeness bar (70%)** + a follow-up-questions panel →
   `/intake/answer`; answering updates the memory and the bar live.

**✅ Verify:** answering follow-ups raises the bar and enriches memory; a post-visit line updates the
timeline.

---

## Phase 5 — Deploy (simple, linear)

**Goal:** get the repo live with the least fuss. Once the build works locally, deploy straight from
the repo.

**Steps (in order):**
1. **Push to GitHub** — init git, commit everything, create the repo, push.
2. **Swap to PostgreSQL** — replace the in-memory stores with Postgres (JSONB) tables per
   `build-specs.md` §4. Endpoint behavior stays identical. (Skip only if time is tight — in-memory
   still demos.)
3. **Deploy the backend (Railway)** — connect the GitHub repo, add a Postgres database, set env vars
   (`ANTHROPIC_API_KEY`, `CLAUDE_MODEL=claude-fable-5`, `DATABASE_URL`).
   Railway auto-deploys from the repo and gives a public URL.
4. **Deploy the frontend** — set `NEXT_PUBLIC_API_URL` to the Railway URL, deploy (Vercel or your
   host), get the live URL.
5. **Connect + check** — confirm the deployed frontend reaches the deployed backend end-to-end.

> Keep it linear: repo → backend deploy → set frontend URL → frontend deploy. No extra infra,
> no Docker, no S3.

**✅ Verify:** the full loop (upload → memory → match → prep → chat → memory update) runs on the live
URL, twice, clean.

---

## Working in parallel (optional, if more people help)

The phases are the **integration order**, but people can run ahead against mock JSON:
- **Frontend** — build all 5 screens off mock responses anytime.
- **Backend** — stub endpoints returning mock JSON, then swap in real engines.
- **AI** — build + test each engine on sample inputs independently.
- **Sample data** — write the doctor JSON records standalone, plugs in at Phase 2.

Everyone stays pinned to the `architecture.md` §4/§5 contracts, so nobody blocks anybody.

---

## If something breaks
- Don't hand-fix — tell Claude *what's wrong* and let it redo (use `/rewind`).
- Keep steps small and verified. A broken phase is easy to trace; a broken "everything" is not.
- Demo-minimum first, always.
