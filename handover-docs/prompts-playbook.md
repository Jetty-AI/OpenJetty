# OpenJetty — Prompts Playbook (for Ajay)

> **Two ways to use the plan — pick one:**
> 1. **Auto:** upload the 3 docs (`architecture.md`, `build-specs.md`, `implementation-guide.md`)
>    and say *"Build OpenJetty following implementation-guide.md, phase by phase."* Claude drives.
> 2. **Manual (this doc):** paste these prompts one at a time, in order, and check each result.
>    Use this if you want to go slow and watch every step.
>
> Either way, keep the 3 docs in the project so Claude has the contracts. Keys → `keys-and-setup.md`.

---

## 🙋 The only things YOU do by hand (everything else is a prompt)

These need a human because they're logins / secret keys (all listed in `keys-and-setup.md`):
1. **Anthropic API key** — Anthropic gives it ~9am Saturday. Paste it into `backend/.env` when asked.
2. **GitHub login** — when Claude pushes, authorize `gh` in the browser. (one time)
3. **Railway login** — when Claude deploys, authorize in the browser. (one time)
4. **Vercel login** — when Claude deploys the frontend, authorize in the browser. (one time)

When Claude needs one, it pauses and asks. Provide it and say "continue."

---

## How to paste

- Copy the text **inside the box** → paste into Claude Code → enter.
- Let it run; accept the changes it proposes. Keep **Auto-accept edits** on (`Shift+Tab`).
- Run the ✅ check. If wrong, say *"that's not working, here's what I see: [paste]"* and let Claude fix.

---

# PHASE 0 — Setup

### P0.1 — Load the docs
```
Read architecture.md, build-specs.md, and implementation-guide.md in this project. Summarize the
plan back to me in 5 bullets so I know you understand. Then wait — don't build yet.
```
✅ Claude names the 5 screens, 6 engines, 7 endpoints, and the memory-first idea.

### P0.2 — Scaffold the monorepo
```
Scaffold a monorepo: frontend/ (Next.js + Tailwind via create-next-app, App Router), backend/
(FastAPI in main.py with a /health route returning {"status":"ok"} and CORS enabled), and
sample-data/ (an empty folder for hand-written business JSON records). Add a root .gitignore. Give
me the commands to run both servers.
```
✅ Both folders exist; both servers run.

### P0.3 — Backend deps + env
```
In backend/, create requirements.txt with: fastapi, uvicorn[standard], anthropic, psycopg2-binary,
python-multipart, python-dotenv, pydantic, PyMuPDF. Create .env.example with ANTHROPIC_API_KEY=,
CLAUDE_MODEL=claude-fable-5, DATABASE_URL=. Load env with python-dotenv.
```
✅ `pip install -r requirements.txt` works.

### P0.4 — Connect frontend to backend
```
In the frontend, add NEXT_PUBLIC_API_URL (default http://localhost:8000) and a small API client with
a getHealth() call. Show the backend health status on the home page to prove the connection.
```
✅ Home page shows "backend: ok", no CORS error.

### P0.5 — Shared Claude client (every engine uses this)
```
In backend/ai/claude_client.py, build one reusable Claude client using the Anthropic SDK and the
CLAUDE_MODEL env var. Expose structured(prompt, schema) returning validated JSON, and stream(prompt)
yielding text chunks. Add retry on transient errors.
```
✅ Client is ready (real test happens once the API key is in — see P0.6).

### P0.6 — Test the key (once you have it)
> 🙋 Put your Anthropic API key into `backend/.env`, then paste:
```
Run a quick test that calls claude_client.structured with a trivial prompt and prints the JSON, so
we confirm the API key and the claude-fable-5 model work.
```
✅ Prints valid JSON from Claude.

---

# PHASE 1 — Memory loop (first demo)

### P1.1 — Engine A1 (User Memory Builder)
```
Build backend/ai/a1_user_memory.py with build_user_memory(text, existing_memory) using
claude_client.structured. Return the User Memory JSON from architecture.md §4.1. It must extract
conditions, symptoms, timeline, medications, treatments; quantify lab_trends across time (like
"ferritin 45→32→27"); and MERGE into existing_memory, not overwrite. Add a test on sample
blood-test text.
```
✅ Test prints a User Memory JSON with the lab trend captured.

### P1.2 — /upload + memory storage
```
Add POST /upload (architecture.md §5): accept a PDF + user_id, save the raw file to local disk,
extract text with PyMuPDF, load the user's existing memory, call build_user_memory, store the
result, and return it. Use an in-memory dict store for now. Also add GET /memory/{user_id}.
```
✅ Posting a PDF returns updated memory JSON.

### P1.3 — Upload + Memory screens
```
Build Screen 1 (Upload/Intake): a situation textarea + multi-PDF upload calling POST /upload, with a
"Claude is analyzing…" loading state. Build Screen 2 (Memory): render the returned User Memory
(architecture.md §4.1) in clean sections and highlight the lab trend. Start with mock JSON, then
switch to the real endpoint.
```
✅ Upload the 3 sample PDFs → Memory screen shows merged memory + declining ferritin trend.

---

# PHASE 2 — Business data + Matching

### P2.1 — Write sample doctor data
```
Create 5–10 realistic SAMPLE doctor records (no scraping, no APIs) in the Raw business record shape
from architecture.md §4.5, saved as JSON files in sample-data/. Include name, rating, 2–4 sample
reviews, a written profile_text, and a written guideline_text per doctor. Make 3 "hero" doctors
distinct: a hematologist specializing in iron deficiency/malabsorption (the right match for the
ferritin story), plus a gastroenterologist and an internist as clearly weaker fits.
```
✅ `sample-data/` has 5–10 JSON files in the §4.5 shape, with 3 sharp hero doctors.

### P2.2 — Engines A2 + A3
```
Build backend/ai/a2_business_memory.py → build_business_memory(raw_record) returning Business Memory
(§4.2): specialties, conditions_treated, treatment_philosophy, expertise_keywords, faqs, and
protocols (from the guideline text). Then build backend/ai/a3_match.py → match(user_memory,
business_memories) returning Match result (§4.3): ranked matches with score, confidence, and a
human-readable explanation of WHY each doctor fits this specific user. Reason over both memories,
not keyword search.
```
✅ Both tested; the match explanation uses the user's real details.

### P2.3 — /ingest/business + /match + seed
```
Add POST /ingest/business (accept a Raw business record §4.5, call A2, store Business Memory) and
POST /match (load the user's memory + all business memories, call A3, return §4.3). Add a seed step
that reads sample-data/*.json and ingests them on startup.
```
✅ Doctors ingested on startup; POST /match returns ranked matches.

### P2.4 — Matches screen
```
Build Screen 3 (Matches): cards showing name, specialty, rating, match score, and the why-fit
explanation, calling POST /match and ranking by score. Clicking a card selects that doctor for the
next screens.
```
✅ Hematologist ranks on top, each card has a specific reason.

---

# PHASE 3 — Prep + Proxy Chat

### P3.1 — Engines A4 + A5
```
Build backend/ai/a4_prep.py → prep(user_memory, business_memory) returning Prep package (§4.4):
situation_summary, questions_to_ask, documents_to_bring, tests_to_discuss. Then build
backend/ai/a5_proxy_chat.py → proxy_chat(business_memory, user_memory, history, message) that STREAMS
a reply in the doctor's voice, grounded in Business Memory, using User Memory so the patient never
repeats themselves. If a question is outside the doctor's knowledge, it says it'll flag it for the
visit — no making things up.
```
✅ Prep returns a tailored package; proxy chat streams a grounded reply.

### P3.2 — /prep + /proxy/chat
```
Add POST /prep (calls A4). Add POST /proxy/chat (calls A5, returns a STREAMED response, and appends
messages to a conversation store keyed by user_id + business_id).
```
✅ /prep returns §4.4; /proxy/chat streams.

### P3.3 — Prep + Chat screens
```
Build Screen 4 (Prep): render the prep package (§4.4) as a summary + checklists. Build Screen 5
(Proxy Chat): "Talk to Dr. Chen", a chat UI that renders the streamed reply token by token.
```
✅ Open a match → Prep screen → chat with the proxy; replies stream and reference the user's history.

---

# PHASE 4 — Follow-ups + completeness

### P4.1 — Engine A6 (Follow-up)
```
Build backend/ai/a6_followup.py → follow_up(user_memory) returning {completeness:0-100, missing:[],
questions:[]}. Estimate profile completeness (drives a 70% readiness bar), list what's missing, and
generate targeted questions (how long symptoms existed, iron supplements tried, vegetarian,
digestive symptoms, family history, current medications).
```
✅ Returns a completeness score + sensible questions.

### P4.2 — /intake/answer + memory-after-visit
```
Add POST /intake/answer: take the user's answers, feed them through A1 (merge into memory), and
recompute completeness via A6. Also confirm memory-after-appointments: a chat message like "my doctor
recommended celiac testing" runs A1 and updates timeline, pending_followups, and
recommended_next_steps (architecture.md §7).
```
✅ Answering raises completeness; a post-visit line updates the timeline.

### P4.3 — Memory screen additions
```
On Screen 2 (Memory), add a completeness bar (70%) and a follow-up-questions panel calling
POST /intake/answer. Answering a question updates the memory and the bar live.
```
✅ Answering a follow-up enriches memory and moves the bar.

---

# PHASE 5 — Deploy (simple, linear)

### P5.1 — Push to GitHub
```
Initialize git, create a .gitignore if missing, commit everything with a clear message, create a
GitHub repo named "openjetty" using the gh CLI, and push. Walk me through the GitHub login if needed.
```
🙋 Authorize **GitHub** in the browser.
✅ Code is on GitHub.

### P5.2 — Swap in PostgreSQL
```
Replace the in-memory stores with PostgreSQL (JSONB). Create tables per build-specs.md §4: users,
user_memory (memory JSONB + completeness), documents (raw_text + file_ref), businesses,
business_memory (memory JSONB), conversations (messages JSONB). Keep every endpoint's behavior
identical.
```
✅ App works exactly as before, now backed by Postgres. (Skip if time is tight — in-memory still demos.)

### P5.3 — Deploy the backend (Railway)
```
Deploy the backend to Railway from the GitHub repo: create a project, add a Postgres database, set
env vars (ANTHROPIC_API_KEY, CLAUDE_MODEL=claude-fable-5, DATABASE_URL from the Railway Postgres),
deploy, and give me the public URL. Then run a health check against it.
```
🙋 Authorize **Railway**; paste the **Anthropic API key** when asked.
✅ `https://<your-app>.up.railway.app/health` → `{"status":"ok"}`.

### P5.4 — Deploy the frontend + connect
```
Set the frontend NEXT_PUBLIC_API_URL to the Railway backend URL. Deploy the frontend to Vercel
(install the Vercel CLI, log me in, deploy), and give me the live URL. Confirm the deployed frontend
reaches the deployed backend.
```
🙋 Authorize **Vercel** in the browser.
✅ The live frontend talks to the live backend end-to-end.

### P5.5 — Demo polish
```
Add "Claude is analyzing…" / thinking animations on the slow Claude calls so there's no dead air,
make the streamed chat feel live, and confirm the 3 demo PDFs tell a clean declining-ferritin story.
Then walk me through the full 4-minute demo flow so I can rehearse.
```
✅ Full loop (upload → memory → match → prep → chat → memory update) runs clean on the live app.

---

## Daily survival kit (paste anytime)

| Situation | Paste this |
|---|---|
| Something broke | `That's not working. Here's what I see: [paste error/screenshot]. Fix it.` |
| Undo last change | (press `Esc` twice, or) `Undo the last change.` |
| Lost context | `Re-read architecture.md and build-specs.md, then continue where we left off.` |
| Build from a design | `Build this screen to match the attached image, then screenshot it and compare. [paste image]` |
| Stuck on something hard | `/model` → Opus, then re-ask. |
| Save progress | `Commit everything with a clear message and push to GitHub.` |

---

## The mindset
You're directing, not coding. Paste → let it run → check → if wrong, tell Claude what's wrong and let
*it* fix it. Never hand-edit. Go phase by phase. **Demo-minimum first.**
