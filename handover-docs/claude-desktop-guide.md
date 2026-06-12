# Claude Desktop — Complete Setup & Build Guide (for OpenJetty)

> A full A-to-Z guide to building **and deploying** the whole OpenJetty project from the **Claude
> desktop app** — by chatting. No prior coding experience assumed. By the end you'll be able to:
> install everything, point Claude at your project, build frontend + backend, see the app live,
> push to GitHub, and deploy — all from one window.

---

## 0. The big picture (read first)

The desktop app lets you **describe what you want in plain English**; Claude writes the code on your
machine, shows you the changes, runs the app so you can see it, and can even deploy it. Your whole
job is: **say what you want → review → say "good" or "change this" → repeat.**

Everything for OpenJetty can be done here: the 5 screens, the backend, the AI engines, the sample
data, and the live deployment.

---

## 1. Before you start — install 3 tools (one time, ~15 min) · macOS

Claude runs on **your machine**, so these must exist first. **Two ways — pick one:**

### Easiest: Homebrew (one terminal command)
1. Open the **Terminal** app (Cmd+Space → type "Terminal").
2. Install Homebrew (the Mac package manager) — paste this and press Enter:
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
3. Then install all three at once:
   ```bash
   brew install git node python
   ```
4. Verify: `git --version`, `node --version`, `python3 --version` — each should print a version.

### Or: direct downloads (no terminal)
| Tool | What it's for | Download |
|---|---|---|
| **Git** | versioning code, pushing to GitHub | comes with **Xcode Command Line Tools** — run `xcode-select --install`, or get it from https://git-scm.com/download/mac |
| **Node.js** (v20+) | runs the Next.js frontend | https://nodejs.org → download the **macOS LTS .pkg**, open it, click through |
| **Python** (3.11+) | runs the FastAPI backend | https://python.org → download the **macOS installer**, open it, click through |

> On Mac you may be asked for your password when installing — that's normal. After installing, you
> may need to close and reopen Terminal.

**Accounts to have ready** (free — see `keys-and-setup.md`): GitHub, Railway, Vercel.

---

## 2. Install the Claude desktop app

1. Go to **https://claude.ai/download** → download for **macOS**.
2. Open the downloaded `.dmg` and **drag Claude into your Applications folder**.
3. Open Claude from Applications (first time: right-click → Open if macOS warns about the developer).
4. **Sign in** with your Claude account (needs a paid plan — Pro/Max/Team).

---

## 3. Open the Code experience

1. In the app, click the **Code** tab (top center).
2. Choose your environment:
   - **Local** ✅ — runs on your machine, files stay with you, you see the app live. **Use this.**
   - *(Remote / SSH exist too, but Local is best for the hackathon — easy preview + easy deploy.)*
3. Click **Select folder** → choose your OpenJetty project folder (the one with the docs in it).

Claude now has access to that folder and can read/build everything inside it.

---

## 4. Pick a model

- Use the **model dropdown** (near the send button).
- **Opus** = strongest, for hard tasks. **Sonnet** = fast, for everyday changes.
- You can switch anytime mid-session with `/model`. Start on Opus for the build; drop to Sonnet for
  quick tweaks if you like.

---

## 5. The interface — what you're looking at

- **Chat box** (bottom) — where you type what you want.
- **Changes / diffs** — when Claude edits files, it shows green (added) / red (removed) lines. A
  `+12 -1` badge means 12 lines added, 1 removed. Click it to see details.
- **Accept / Reject** — approve or decline a change.
- **Permission mode button** (a shield icon) — controls how much Claude does before asking (next
  section).

You do **not** need to read the code. Read the **result** (the running app).

---

## 6. Permission modes — your speed control

Press **`Shift + Tab`** to cycle through these:

| Mode | What it does | When to use |
|---|---|---|
| **Ask** (default) | asks before each edit/command | when you want to watch closely |
| **Auto-accept edits** | applies edits automatically, still asks before running commands | **best for fast building** — fewer clicks |
| **Plan mode** | only plans, changes nothing | before a big feature, to see the approach first |

**Tip:** stay in **Auto-accept** most of the time so you're not clicking "yes" all day.

---

## 7. The core build loop

```
You describe what you want
        ↓
Claude proposes changes (shows the diff)
        ↓
You Accept ✅  or  type feedback ("close, but make the button blue")
        ↓
Claude adjusts → runs the app → you see it
        ↓
Next task
```

- The chat **remembers context** — you never repeat yourself.
- Keep tasks **small and one at a time** (one screen, one feature) — easier to verify.

---

## 8. Essential slash commands (type `/` to see all)

| Command | Does | Use when |
|---|---|---|
| **`/init`** | creates a `CLAUDE.md` project-memory file | first thing in the project |
| **`/clear`** | wipes chat context, keeps project memory | starting a new, unrelated task |
| **`/rewind`** | undo — go back to an earlier state | something broke; don't hand-fix, rewind |
| **`/plan`** | plan a big change first | large feature |
| **`/model`** | switch Sonnet ↔ Opus | stuck on something hard |
| **`/help`** | list all commands | you forget one |

The three you'll use most: **`/init`** (once), **`/clear`** (between tasks), **`/rewind`** (when stuck).
Also: press **`Esc`** to stop Claude mid-action if it's going the wrong way.

---

## 9. Power features that save hours

- **Preview — see the app live.** Use the **Preview** option (or ask *"run the dev server and show
  me"*). Claude launches the app and you watch the real UI — not just code. **This is the desktop
  app's biggest advantage** for the frontend.
- **Paste a design screenshot.** Drag/paste an image into the chat: *"Build this screen in Next.js +
  Tailwind, then screenshot it and compare to mine."* Claude builds from the picture and checks
  itself. Huge time-saver.
- **Reference files with `@`** — type `@frontend/app/page.tsx` to point Claude at a file instead of
  describing it.
- **Let it commit/push** — *"commit this with a clear message and push to GitHub."* No git knowledge
  needed.
- **Interrupt freely** — `Esc`, type a correction, Enter. Context is kept.

---

## 10. Building OpenJetty — how to actually drive it

1. **Put the docs in the project folder:** `architecture.md`, `build-specs.md`,
   `implementation-guide.md` (the three drivers), plus the rest of `handover-docs/`.
2. **Run `/init`** once and let Claude create a `CLAUDE.md` (see §13).
3. **Kick off the build** — paste:
   > *"Read architecture.md, build-specs.md, and implementation-guide.md. Then start with Phase 0 and
   > build phase by phase, verifying each phase before the next."*
4. **Go phase by phase** (Phase 0 → 5). After each phase, use **Preview** to confirm it works before
   moving on. If you'd rather drive manually, copy prompts from `prompts-playbook.md` (P0.1 → P5.5).
5. **9am Saturday:** paste the Anthropic key into `backend/.env`, then ask Claude to run a quick test
   call to confirm Fable 5 works.

The phases (full detail in `implementation-guide.md`):
Phase 0 setup → 1 memory loop → 2 sample data + matching → 3 prep + chat → 4 follow-ups → 5 deploy.

---

## 11. Git & GitHub from the desktop

You never touch a terminal. Just ask:
- *"Initialize git and make the first commit."*
- *"Create a GitHub repo called openjetty and push."* (a browser login pops up — click authorize)
- *"Commit everything with a clear message and push."* (after any change)

Claude proposes; you approve. That's it.

> **Solo build — work directly on `main`, no branches.** Tell Claude once: *"Work directly on main —
> never create branches or PRs. Just commit and push to main."*

---

## 12. Deploying from the desktop (the whole thing, by prompt)

Because you're on your local machine, **browser logins work** — so deploying is easy. Full detail in
`deployment.md`. The short version:

1. *"Push the project to GitHub."* → authorize GitHub.
2. *"Deploy the backend to Railway from the repo, add a Postgres database, set the env vars
   (ANTHROPIC_API_KEY, CLAUDE_MODEL=claude-fable-5, DATABASE_URL), and give me the public URL."* →
   authorize Railway, paste the Anthropic key.
3. *"Set the frontend NEXT_PUBLIC_API_URL to that Railway URL and deploy the frontend to Vercel."* →
   authorize Vercel.
4. *"Open the deployed site and run the full flow; fix anything that fails."*

Railway + Vercel **auto-deploy on every push** afterwards — so during the day, *"commit and push"* =
re-deploy in ~1–2 minutes.

---

## 13. CLAUDE.md — set it once, save hours

Run **`/init`**, then have Claude put this in the project's `CLAUDE.md` so it remembers your setup
every session:

```
# OpenJetty
- Stack: Next.js + Tailwind (frontend), FastAPI + Postgres (backend), Claude Fable 5 (claude-fable-5)
- Build per implementation-guide.md, phase by phase. Contracts are fixed in architecture.md §4/§5.
- Business data = hand-authored sample JSON in sample-data/businesses/ (no scraping, no external APIs). Demo patient PDFs in sample-data/patient/.
- Frontend talks to backend via NEXT_PUBLIC_API_URL. Build against mock JSON first.
- Render JSON from the backend; don't compute logic on the frontend.
- Solo build: commit directly to main and push often. Never create branches or PRs.
```

Now Claude never needs you to re-explain the project.

---

## 14. Keys & secrets — keep it safe

- Real keys go **only** in `backend/.env` (and the host's env settings) — **never** in code, never in
  a committed file, never pasted in the chat. `.env` is gitignored.
- You'll handle just a few by hand: the Anthropic key (paste at 9am) and the GitHub/Railway/Vercel
  logins (browser clicks).
- After the hackathon, revoke/rotate any tokens. Full list → `keys-and-setup.md`.

---

## 15. Prompting well (the whole skill)

**Specific request + a way to verify = far fewer back-and-forths.**

❌ "Make the matches page better."
✅ "Build the Matches screen: cards with doctor name, specialty, rating, a match score, and a
'why this fits you' line. Tailwind, clean and modern. Here's the design: [paste image]. Use mock
JSON for now."

Rules of thumb:
- **One screen / one task at a time.**
- **Always give something to check against** (a screenshot, or "run it and show me").
- **Don't trust "looks done"** — make Claude run the app and show you.
- **`/clear` between unrelated tasks** — a fresh chat + a good prompt beats a long messy one.

---

## 16. Troubleshooting

| Problem | Do this |
|---|---|
| Something broke | *"That's not working. Here's what I see: [paste error/screenshot]. Fix it."* |
| Want to undo | press `Esc` twice, or `/rewind` |
| Claude lost the thread | *"Re-read architecture.md and build-specs.md, then continue."* |
| Frontend can't reach backend | *"Check NEXT_PUBLIC_API_URL and CORS; make a test call and fix."* |
| Claude call fails | confirm `ANTHROPIC_API_KEY` is set and `CLAUDE_MODEL=claude-fable-5` |
| Stuck on something hard | `/model` → Opus, then re-ask |

---

## 17. Daily cheat sheet

| Moment | Paste this |
|---|---|
| Start the build | *"Read the 3 docs and start with Phase 0, phase by phase."* |
| Build a screen | *"Build the [X] screen to match this design [paste], using mock JSON."* |
| See it run | *"Run the app and show me."* (or use Preview) |
| It broke | `/rewind` |
| New, unrelated task | `/clear` then describe it |
| Save work | *"Commit with a clear message and push."* |
| Deploy | follow `deployment.md` steps |

---

## 18. The mindset

You're **directing**, not coding. Describe clearly, give Claude a picture to aim at, let it run, and
check the result. When it's wrong, don't fix it by hand — tell Claude what's wrong and let it redo.
Go phase by phase. **Demo-minimum first.** That's the whole skill.

---

*Everything in OpenJetty — build, preview, git, and deploy — can be done from this one desktop app.
You don't need the web version or the terminal.*
