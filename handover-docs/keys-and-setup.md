# OpenJetty — Keys & Setup Checklist

> Everything you need **keys / accounts / tokens-wise** to build and deploy. Get these ready before
> Saturday (except the Anthropic key, which Anthropic gives you on the day). **Nothing secret goes
> into git** — keys and tokens live only in `.env` files, which are gitignored.

---

## Two deploy modes (pick one) — this decides what you need

| Mode | What you give | What happens |
|---|---|---|
| **A. Click-login (simplest)** | just the **API keys** | Claude builds & runs deploy, **you click 3 browser logins** (GitHub, Railway, Vercel) |
| **B. Fully autonomous (zero clicks)** | API keys **+ platform tokens** | Claude deploys **entirely by itself** via CLI — no browser logins |

Mode A needs less setup. Mode B is hands-off but you create 3 tokens first. Both are fine.

---

## 1. API keys — ALWAYS needed (both modes)

| # | What | Where to get it | When | Needed for |
|---|---|---|---|---|
| 1 | **Anthropic API key** | Given by Anthropic ~9am Saturday | On the day | Every Claude (Fable 5) call |
| 2 | **Claude Code (Max)** | Already have it | Now | Doing the actual building |

> Business data needs **no key** — it's hand-authored sample JSON (no Google/Yelp/scraping).

---

## 2. Platform tokens — ONLY for Mode B (fully autonomous deploy)

Skip these if you're fine clicking 3 logins (Mode A). For zero-click deploy, create all three:

| # | Token | Where to create it | Scope to set | Used for |
|---|---|---|---|---|
| 4 | **GitHub PAT** | github.com → Settings → Developer settings → Personal access tokens → **Fine-grained** | this repo only: **Contents** read/write + **Administration** (to create the repo) | push + create repo without browser login |
| 5 | **Railway token** | railway.app → Account Settings → **Tokens** → Create | account/project token | deploy backend + Postgres without login |
| 6 | **Vercel token** | vercel.com → Settings → **Tokens** → Create | default | deploy frontend without login |

> Set a **short expiry** (e.g. 7 days) on each token if the platform allows it. You'll revoke them
> right after the hackathon anyway (see Safety).

---

## 3. Accounts to have (free)

| Account | Where | For |
|---|---|---|
| **GitHub** | github.com | hosting the repo |
| **Railway** | railway.app | backend + Postgres (one-click managed Postgres) |
| **Vercel** | vercel.com | frontend deploy |

> Railway provides **managed PostgreSQL** as a one-click add-on and auto-fills `DATABASE_URL` — you
> don't set up a database yourself. Frontend host alt: if you use **Manus** (openjetty.us.com),
> deploy there instead of Vercel and skip the Vercel token.

---

## 4. Where each value goes

### `backend/.env`  (never committed)
```
ANTHROPIC_API_KEY=sk-ant-...          # from Anthropic, 9am Saturday
CLAUDE_MODEL=claude-fable-5
DATABASE_URL=postgresql://...         # local at first; Railway auto-fills it on deploy

# Mode B only — platform tokens (for autonomous deploy):
GITHUB_TOKEN=ghp_...
RAILWAY_TOKEN=...
VERCEL_TOKEN=...
```

### `frontend/.env.local`  (never committed)
```
NEXT_PUBLIC_API_URL=http://localhost:8000     # later: your Railway backend URL
```

> `.env` and `.env.local` must be in `.gitignore` (the scaffold adds this). The `.env.example` files
> are safe to commit — they have the **names, not the values**.

### On the hosts
- **Railway env vars:** `ANTHROPIC_API_KEY`, `CLAUDE_MODEL`, `DATABASE_URL` (auto)
- **Vercel env var:** `NEXT_PUBLIC_API_URL` = the Railway backend URL

---

## 5. Tools to install (once, before Saturday)

| Tool | Why | Install |
|---|---|---|
| **Git** | version control | git-scm.com/downloads (macOS: `xcode-select --install` or `brew install git`) |
| **Python 3.11+** | backend + sample-data scripts | python.org |
| **Node.js 20+** | frontend | nodejs.org |
| **GitHub CLI (`gh`)** | push + create repo by prompt | cli.github.com |
| **Railway CLI** | backend deploy by prompt | Claude can install during deploy |
| **Vercel CLI** | frontend deploy by prompt | Claude can install during deploy |

You don't need Postgres locally if you use in-memory until deploy — Railway gives managed Postgres.

---

## 6. To tell Claude for Mode B (autonomous)

After the tokens are in `backend/.env`, say:
```
Deploy using the GITHUB_TOKEN, RAILWAY_TOKEN, and VERCEL_TOKEN in backend/.env via the CLIs — do not
use browser login. Push to GitHub, deploy the backend + Postgres on Railway, set the frontend
NEXT_PUBLIC_API_URL to the Railway URL, and deploy the frontend on Vercel. Report each URL.
```

For Mode A, just run the deploy prompts in `prompts-playbook.md` (P5.x) and click the logins.

---

## 7. Saturday morning order (fast path)
```
9:00am  Get the Anthropic API key
9:02am  Paste it into backend/.env (and Railway env vars later)
9:05am  Confirm Fable 5 works (trivial test call)
9:10am  Build phases 1–4 (playbook)
Deploy  push → Railway backend → set frontend URL → frontend deploy
2:00pm  Freeze. Rehearse the demo.
```

---

## 8. Is this safe? (yes — if you do these)

Giving Claude Code the keys/tokens is safe **for a hackathon** because Claude Code runs **locally on
your machine**, and the tokens stay in your local `.env` and are sent only to each platform's own API.
The real risk is a token **leaking** (committed to git, pasted in chat, shared). So:

- ✅ **Keep keys/tokens only in `.env`** — never in code, never in a committed file, never pasted into
  the chat window. `.env` is gitignored.
- ✅ **Scope tokens narrowly** — GitHub PAT limited to this one repo; short expiry where possible.
- ✅ **Revoke everything after the event** — delete the GitHub PAT, Railway token, and Vercel token
  once the hackathon is over.
- ✅ **Keep the Anthropic key private** — share with the team only via a private channel, not in the repo.
- ⚠️ **If a token leaks** (e.g. accidentally committed): immediately delete it in the provider console
  and create a new one. A revoked token is useless to anyone.

Do these and it's safe. Mode A (click-login, no tokens stored) is the most conservative if you'd
rather not store deploy tokens at all.
