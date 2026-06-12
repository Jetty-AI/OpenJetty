# OpenJetty — Build Specs (Full)

> **What gets built, in what order, with which tech.** Hand each section to Claude Code and build.
>
> - System design, **data model, API contracts, workflow** → `architecture.md` (source of truth)
> - All JSON shapes + endpoints referenced below live in `architecture.md` §4–§5. Build against
>   those exact shapes.

---

## 0. Assumptions (correct before building)

1. **Prep engine stays** (core). Only appointment **booking/scheduling** is dropped.
2. **Embeddings / pgvector = Phase-2 scalability layer** (listed in the stack, not removed).
   Claude reasoning over structured memory is the **MVP matching mechanism**.
3. **Business data source:** **hand-authored sample records (staged data)** in the §4.5 shape —
   written by us, not fetched/scraped. No external business APIs.
4. **Scale:** ~5–10 sample doctors; 3 fully enriched "hero" profiles for the live demo.
5. **Memory-first core** = MVP, **including** the follow-up engine + completeness meter
   (core deliverables, not optional).
6. **Doctor vertical only.** Real AI, staged (sample) business data.

---

## 1. Tech Stack (full)

| Layer | Tech | Notes |
|---|---|---|
| **Frontend** | Next.js + React + Tailwind CSS | 5 screens, renders JSON, streaming chat UI |
| **Backend** | FastAPI (Python) | Orchestrates engines, owns endpoints |
| **Database** | PostgreSQL + **JSONB** | Memory stored as JSONB columns |
| **File storage** | Local disk | Raw uploaded PDFs |
| **PDF parsing** | PyMuPDF | Extract text from lab reports |
| **AI** | Claude **Fable 5** (`claude-fable-5`) | Structured output (JSON) + streaming |
| **Business data** | Hand-authored sample JSON (no scraping) | Raw business records (§4.5), seeded at startup |
| **Deploy** | Railway / Render | Backend hosting + env vars |
| **Phase-2 / scalability** | pgvector (embeddings) | Listed, not MVP — Claude reasoning is MVP matching |
| **Out of scope** | auth, payments, EMR, booking | Not built |

---

## 2. Build Order (what happens when)

```
STEP 0 — LOCK CONTRACTS (everyone, first hour)
  Agree architecture.md §4 (JSON shapes) + §5 (endpoints).
  After this, every component builds against MOCK JSON — no one waits on anyone.
        │
        ▼
PHASE 1 — PARALLEL FOUNDATION
  AI         → A1 (User Memory) + A2 (Business Memory) + A6 (follow-up/completeness)
  Backend    → schema + /upload + /intake/answer + /ingest/business + /match
  Sample data→ write 5–10 sample doctors as Raw business records → JSON files
  Frontend   → Upload + Memory/Follow-ups + Matches screens (mock JSON)
        │
        ▼
PHASE 2 — MIDDAY INTEGRATE
  Sample data → Backend /ingest/business → AI A2 → business_memory filled
  Frontend ↔ Backend live (/upload, /match working end-to-end)
        │
        ▼
PHASE 3 — PREPARE + TALK
  AI        → A3 (Match) finalized, A4 (Prep), A5 (Proxy Chat, streaming)
  Backend   → /prep + /proxy/chat (streamed)
  Frontend  → Prep + Chat screens live
        │
        ▼
PHASE 4 — POLISH + SAFETY (last)
  Completeness bar polish, loading animations, golden cached responses,
  one full run-through
```

**Critical path:** sample data → A2 → business_memory must be filled *before* Matching (A3) can be
demoed. Write the sample records early in Phase 1.

> ### 📌 Note — demo-minimum vs full (how we actually build this in 1 day)
> The system is live-built during the hackathon hours, so build the **demo-minimum first**, then
> add the **full version only if time is left.** This keeps the live build safe.
>
> | Part | Demo-minimum (build first) | Full (if time left) |
> |---|---|---|
> | **Database** | In-memory dict / JSON in the running app — memory "persists" for the demo session | Postgres + JSONB tables |
> | **Business data** | **3 hero doctors** hand-written as sample JSON | 5–10 sample doctors |
> | **Engines** | **A1–A6** — full memory-first loop incl. follow-up + completeness | (engines unchanged — only scale grows) |
> | **Seeding** | Sample JSON files loaded at startup | same |
> | **Deploy** | Backend on Railway, frontend connects via `API_URL` env var | same |
>
> **Rule:** get the 4-min demo loop working end-to-end with the minimum column **first**. Only
> after one clean run-through, reach for the full column. Don't build Postgres before the loop works.

---

## 3. 🧠 AI Engines

**What gets built:** 6 Claude engines. All structured-output (JSON) except Proxy Chat (streamed).
One shared Claude client + prompt library. Model **Fable 5 (`claude-fable-5`)**. No vector DB —
full structured memory into context.
**Contracts:** `architecture.md` §4 (data shapes). **Engines overview:** `architecture.md` §3.

### Engine A1 — User Memory Builder
- **In:** parsed document/chat text + existing User Memory (if any)
- **Out:** updated **User Memory** (§4.1) — **merge**, don't overwrite
- **Prompt job:** extract conditions, symptoms, timeline, medications; **quantify lab trends
  across time** ("ferritin 45→32→27"); merge into prior memory.
- **Memory After Appointments:** A1 also runs on post-visit chat — e.g. "my doctor recommended
  celiac testing" updates `timeline`, `pending_followups`, `recommended_next_steps`.

### Engine A2 — Business Memory Builder
- **In:** **Raw business record** (§4.5) — profile text + reviews + guideline text
- **Out:** **Business Memory** (§4.2)
- **Prompt job:** structure specialties, conditions_treated, treatment_philosophy,
  expertise_keywords, faqs, protocols (from guideline text), preferred/excluded cases.

### Engine A3 — Matching Engine ⭐ hero
- **In:** one User Memory + N Business Memories
- **Out:** **Match result** (§4.3) — score + confidence + **explanation**
- **Prompt job:** reason over both memories (NOT keyword search); explain *why* each fits the
  user's specific situation.

### Engine A4 — Prep Engine
- **In:** User Memory + matched Business Memory
- **Out:** **Prep package** (§4.4)
- **Prompt job:** situation summary + questions to ask + documents to bring + tests to discuss.

### Engine A5 — Proxy Chat
- **In:** Business Memory + User Memory + conversation history + new message
- **Out:** **streamed** reply, in the doctor's voice, grounded in Business Memory
- **Prompt job:** answer as the doctor's proxy; use User Memory so the user never repeats
  themselves; if outside knowledge, say you'll flag it for the visit.

### Engine A6 — Follow-up Engine (core)
- **In:** User Memory
- **Out:** `{ completeness: 0-100, missing[], questions[] }`
- **Prompt job:** estimate profile completeness (drives the **70% readiness bar**), list gaps,
  generate targeted questions — e.g. "How long have symptoms existed? Iron supplements tried?
  Vegetarian? Digestive symptoms? Family history? Current medications?" Each answer feeds A1.

**Checklist**
- [ ] Shared Claude client (model, structured-output, streaming, retry, **cached fallback**)
- [ ] Prompt library (one per engine)
- [ ] JSON schemas for A1–A4, A6
- [ ] Each engine callable + unit-tested on sample input
- [ ] **Golden cached responses** for the demo inputs (safety)

**Paste-to-Claude-Code:**
> "Build 6 Claude (Fable 5) engine functions per build-specs.md §3 and the contracts in
> architecture.md §4. Each takes the defined inputs and returns the defined JSON via structured
> output (chat streams). Add a shared client with retry + golden-cache fallback. Test each on
> sample data."

---

## 4. ⚙️ Backend

**What gets built:** FastAPI service, Postgres schema, storage, deployment. Owns the API
contracts and the DB. *Imports* the AI engines (doesn't write them).
**Contracts:** `architecture.md` §5 (endpoints) + §4 (shapes).

### Tech
FastAPI (Python), **PostgreSQL** (JSONB), local disk for files, deploy on **Railway/Render**.

### DB tables
> Hybrid Memory: `documents` = Layer 1 (raw docs), `*_memory` JSONB = Layer 2 (structured).
- `users(user_id, created_at)`
- `user_memory(user_id, memory JSONB, completeness, updated_at)`
- `documents(doc_id, user_id, filename, raw_text, file_ref, created_at)`
- `businesses(business_id, name, specialty, source, raw JSONB)`
- `business_memory(business_id, memory JSONB, updated_at)`
- `conversations(session_id, user_id, business_id, messages JSONB, updated_at)`

### Endpoints (implement `architecture.md` §5)
- `/upload` → save file, parse PDF (PyMuPDF), call A1, upsert user_memory
- `/intake/answer` → call A1 (merge), update completeness via A6
- `/memory/{user_id}` → return memory
- `/match` → load user_memory + all business_memory, call A3
- `/prep` → call A4
- `/proxy/chat` → call A5, **stream**, append to conversations
- `/ingest/business` → accept Raw business record, call A2, upsert business_memory

**Checklist**
- [ ] Postgres schema + migrations
- [ ] PDF parsing util (PyMuPDF)
- [ ] All endpoints wired to AI engines
- [ ] Streaming for `/proxy/chat`
- [ ] CORS for frontend
- [ ] Deploy (Railway/Render) + env vars (Claude API key)
- [ ] Seed script to load the sample business records via `/ingest/business`

**Paste-to-Claude-Code:**
> "Build a FastAPI backend with Postgres implementing the endpoints in architecture.md §5 and
> the JSONB shapes in §4. Add PDF parsing (PyMuPDF), streaming for /proxy/chat, CORS, a seed
> script for /ingest/business, and a Railway deploy config. Import AI engine functions from the
> ai module."

---

## 5. 📁 Sample Business Data

**What gets built:** a set of **hand-authored Raw business records (`architecture.md` §4.5)** for
~5–10 sample doctors, saved as JSON and seeded via `/ingest/business`. We **write** realistic data
(staged) — there is no scraping and no external API. A2 structures it into Business Memory.

### What to write per doctor (§4.5 shape)
- `name`, `specialty`, `location`, `rating`, `review_count`
- `reviews` — 2–4 realistic sample review lines
- `profile_text` — a short written bio/specialty blurb (what a profile page would say)
- `guideline_text` — a short written clinical-protocol blurb (the doctor's "knowledge")
- `source: ["sample"]`

### Make the data tell the demo story
The 3 **hero** doctors must clearly differ so matching is obvious — e.g. a **hematologist**
specializing in iron deficiency / malabsorption (the right match for the ferritin story), plus a
gastroenterologist and an internist who are clearly less-perfect fits.

**Checklist**
- [ ] 3 hero doctors fully written (sharp, distinct specialties)
- [ ] 2–7 more sample doctors for a fuller list
- [ ] Each matches the §4.5 field names exactly
- [ ] Saved as `sample-data/*.json`
- [ ] Loaded via the backend seed script → `/ingest/business`

**Paste-to-Claude-Code:**
> "Create 5–10 realistic SAMPLE doctor records (no scraping, no APIs) in the Raw business record
> shape from architecture.md §4.5, saved as JSON in a sample-data/ folder. Make 3 'hero' doctors
> distinct (a hematologist for iron deficiency, plus clearly weaker-fit specialties) with written
> reviews, profile_text, and guideline_text. Then load them via the backend seed script to
> /ingest/business."

---

## 6. 🎨 Frontend

**What gets built:** Next.js + Tailwind, 5 screens calling the backend. Render JSON, don't
compute. Clean, functional.
**Contracts:** `architecture.md` §5 (endpoints) + §4 (shapes).

### Screens
1. **Upload / Intake** — situation text + PDF upload → `POST /upload`
2. **Memory + Follow-ups** — extracted memory + **completeness bar (70%)** + follow-up Qs → `POST /intake/answer`
3. **Matches** — cards: name, specialty, rating, **score**, **why-fit explanation** → `POST /match`
4. **Prep** — situation summary + questions + documents + tests → `POST /prep`
5. **Proxy Chat** — streamed chat "Talk to Dr. Chen" → `POST /proxy/chat`

**Checklist**
- [ ] 5 screens + routing
- [ ] API client for the endpoints (mock JSON first)
- [ ] Streaming chat render
- [ ] "Claude is analyzing..." loading animations
- [ ] Completeness bar component (70% readiness)

**Paste-to-Claude-Code:**
> "Build a Next.js + Tailwind app with 5 screens (Upload, Memory, Matches, Prep, Chat) calling
> the endpoints in architecture.md §5 and rendering the §4 JSON shapes. Start with mock JSON,
> add a streaming chat screen and loading animations."

---

## 7. Demo safety (non-negotiable)
- **Sample business data** pre-written and seeded — no live fetching/scraping, fully controlled.
- **Thinking animations** + streamed chat (frontend) — no dead-air.
- One full **run-through** before the pitch.

---

## 8. The one rule
> Everyone codes against the `architecture.md` §4/§5 contracts with **mock JSON** — never against
> another component's half-built code. That's how the whole thing ships in one day.
