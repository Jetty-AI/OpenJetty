# OpenJetty — Deployment Guide

> How to take the finished code live. **It's linear: push → connect → paste keys → live.**
> Railway and Vercel auto-deploy from your GitHub repo, so there's no DevOps. Claude Code can do
> almost all of it by prompt — you only click a few logins and paste two keys.
>
> Keys come from `keys-and-setup.md`. Prompts are in `prompts-playbook.md` (P5.x).

---

## What gets deployed

| Piece | Goes to | Gives you |
|---|---|---|
| **Backend** (FastAPI + Postgres) | **Railway** | a public API URL like `https://openjetty-api.up.railway.app` |
| **Frontend** (Next.js) | **Vercel** (or Manus) | a public site URL like `https://openjetty.vercel.app` |

The whole job is: deploy the backend, copy its URL into the frontend, deploy the frontend.

---

## The flow (one picture)

```
1. Push code to GitHub
        ↓
2. Railway ← connect the repo → auto-builds the backend
        + add a Postgres database (one click)
        + paste env vars (keys)
        → backend is LIVE, you get its URL
        ↓
3. Frontend: set NEXT_PUBLIC_API_URL = that backend URL
        ↓
4. Vercel ← connect the repo → deploys the frontend
        → frontend is LIVE
        ↓
5. Open the site → it talks to the live backend → done
```

---

## 🙋 What you do by hand (everything else is a prompt)

1. **GitHub login** — authorize in the browser when pushing.
2. **Railway login** — authorize in the browser.
3. **Vercel login** — authorize in the browser.
4. **Paste `ANTHROPIC_API_KEY`** into Railway env vars.

That's it. Claude does the rest.

---

## Step 1 — Push the code to GitHub

**Prompt (Claude Code):**
```
Initialize git, create a .gitignore if missing, commit everything with a clear message, create a
GitHub repo named "openjetty" using the gh CLI, and push. Walk me through the GitHub login if needed.
```
🙋 Authorize **GitHub** in the browser.
✅ Your code is on GitHub.

---

## Step 2 — Deploy the backend on Railway

Railway watches the repo and rebuilds on every push — no manual builds.

**Prompt (Claude Code):**
```
Deploy the backend folder to Railway from the GitHub repo: create a Railway project, add a PostgreSQL
database, set the environment variables (ANTHROPIC_API_KEY, CLAUDE_MODEL=claude-fable-5, DATABASE_URL
from the Railway Postgres), deploy, and give me the public backend URL. Then hit /health on it to
confirm.
```

🙋 Authorize **Railway**. When asked, paste the **Anthropic** key.

**Env vars to set on Railway** (values from `keys-and-setup.md`):

| Variable | Value |
|---|---|
| `ANTHROPIC_API_KEY` | your Anthropic key (given ~9am Saturday) |
| `CLAUDE_MODEL` | `claude-fable-5` |
| `DATABASE_URL` | auto-filled by the Railway Postgres add-on |

✅ `https://<your-app>.up.railway.app/health` → `{"status":"ok"}`. **Copy this backend URL.**

> If you're using a Postgres database: Railway's add-on provides `DATABASE_URL` automatically — link
> it to the backend service and the variable fills itself in.

---

## Step 3 — Point the frontend at the backend

**Prompt (Claude Code):**
```
Set the frontend NEXT_PUBLIC_API_URL to the Railway backend URL I'll paste, and make sure every API
call uses it. Remove any leftover mock-JSON fallbacks.
```
✅ The frontend now calls the live backend (test locally first: `npm run dev`).

---

## Step 4 — Deploy the frontend on Vercel

**Prompt (Claude Code):**
```
Deploy the frontend folder to Vercel: install the Vercel CLI, log me in, set the env var
NEXT_PUBLIC_API_URL to the Railway backend URL, deploy, and give me the live site URL.
```
🙋 Authorize **Vercel** in the browser.
✅ You get a live site URL.

> **Using Manus instead of Vercel?** Skip this step. In Manus, just set the project's API URL
> environment variable to the Railway backend URL and let it redeploy — same outcome.

---

## Step 5 — Final check

**Prompt (Claude Code):**
```
Open the deployed site and run the full flow end-to-end: upload the 3 sample PDFs → see the memory →
get matches → open prep → chat with the proxy. Tell me if anything fails and fix it.
```
✅ The whole loop runs on the **live URLs**, not localhost. Run it **twice**, clean.

---

## Re-deploying after a change (during the day)

Because both hosts auto-deploy from GitHub:

```
make a change → commit & push → Railway + Vercel auto-rebuild in ~1–2 min → live
```

**Prompt:**
```
Commit everything with a clear message and push. Railway and Vercel will auto-deploy.
```

You never touch a build pipeline. Push = deploy.

---

## Quick troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Frontend loads but API calls fail | `NEXT_PUBLIC_API_URL` wrong / not redeployed | set it to the Railway URL, redeploy the frontend |
| CORS error in the browser console | backend CORS not allowing the frontend | ensure CORS is enabled in `main.py` (it is in the scaffold) |
| `/health` works but real endpoints 500 | missing key or DB | check Railway env vars (`ANTHROPIC_API_KEY`, `DATABASE_URL`) |
| Claude calls fail | bad/empty `ANTHROPIC_API_KEY` or wrong model | re-paste the key; confirm `CLAUDE_MODEL=claude-fable-5` |
| Postgres errors | `DATABASE_URL` not linked | link the Railway Postgres add-on to the backend service |

**Prompt for any of these:**
```
The deployed app shows this error: [paste error]. Diagnose and fix it.
```

---

## Demo-day note
- Deploy **before** the pitch, not during. Have the live URLs ready and tested.
- Keep `localhost` running as a backup in case the deployed app has an issue on stage.
- One full run-through on the **live** URL, twice, before you present.
