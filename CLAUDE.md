# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`happyLearning` is a personal AI-powered learning tool. The user types a concept, gets an expert explanation from Claude with a real-world example, and sees 5 branching related concepts to explore next. The app builds a visual tree of the current session and a persistent learning map across all sessions. Sessions and a brain.json memory file are backed up to GitHub. The brain accumulates knowledge over time — depth scores, learning gaps, and connections — and feeds back into every Claude response so explanations build on what the user already knows.

As decisions are made (with user question and approval), add them to this file under the relevant section.

## Stack (decided 2026-06-05)

| Layer | Choice |
|---|---|
| Frontend | React + Vite |
| Session tree visualization | `react-d3-tree` |
| Learning map visualization | `react-force-graph-2d` |
| Backend | Node.js with Express |
| Persistence | JSON files (local) — sessions + brain.json |
| GitHub backup | `@octokit/rest` |
| AI | Claude API (Anthropic) — Sonnet for explanations, Haiku for semantic inference |

## Language Decision (decided 2026-06-05)

JavaScript is used for both frontend and backend.

- **Frontend:** No choice — browsers only understand JavaScript. React requires it.
- **Backend:** Node.js (JavaScript) was chosen over Python so there is only one language to learn. Using Python for the backend would mean context-switching between two languages while simultaneously learning React — unnecessary cognitive load at this stage.

## Teaching Requirement

**The user is learning React as we build this project. Follow this teaching approach for every new feature:**
1. Explain the concept first in plain English before touching any code
2. Ask Garima questions to check her understanding — make her reason about it, not just receive it
3. Show small pieces and ask her to explain what she thinks it does before moving on
4. Build together, not for her — slower pace is correct and intentional

 Every time code is written, all technical concepts, decisions, and jargon must be explained clearly for a non-technical audience. Do not assume prior knowledge of React, JavaScript frameworks, or backend concepts. Explain the why, not just the what.

## Deployment (decided 2026-06-15)

| Layer | Platform | URL |
|---|---|---|
| Frontend | Vercel | https://happy-learning-product.vercel.app |
| Backend | Render (free tier) | https://happylearning-api.onrender.com |

Vercel auto-deploys are not wired up — manual redeploy required after each push. Render free tier has ephemeral disk (resets after ~15 min idle) — brain.json and sessions are repopulated from seed files on cold start.

**Environment variables:**
- Local backend: `ANTHROPIC_API_KEY`, `GITHUB_TOKEN`, `GITHUB_SESSIONS_REPO` in `.env` (gitignored)
- Local frontend: `VITE_API_URL=http://localhost:3001` in `frontend/.env.local` (gitignored)
- Render: same backend vars set as environment variables in Render dashboard
- Vercel: `VITE_API_URL=https://happylearning-api.onrender.com` set in Vercel dashboard

## Seed data (decided 2026-06-15)

The deployed site pre-populates with demo data so the learning map and node panels are immediately usable by portfolio visitors.

- `backend/brain.seed.json` — 20 developer-centric concepts with connections and depth scores
- `backend/sessions.seed/` — 3 session files with full explanations, real-world examples, and follow-up Q&As for all 20 concepts
- `backend/storage.js` copies these into `brain.json` and `sessions/` on startup if those are empty (Render cold start)
- Local use is unaffected — local files already exist so the copy is never triggered

## Working on Windows

This project runs on Windows 11 with PowerShell as the primary shell. Use PowerShell syntax in all commands (e.g. `$env:VAR`, backtick for line continuation, `;` not `&&` for chaining).

## Claude Code - Rules of Engagement 

Do not build anything without asking me first. Explain what you're about to do and why, then wait for my approval before writing any code. The goal is for me to learn from the building process that you are doing so you must explain all technical concepts and jargon and actions you do very cleanly and clearly to a non-technical audience (me) as you are building.
Before you build anything, you must tell me what you are going to build first and why. Don't build anything without a thorough explanation first given to me and my approval.

**Before running ANY terminal command**, you must:
1. State the exact command you are about to run
2. Explain in plain English what it does and why we need it
3. Then run it

Never run a command silently or without prior explanation. This applies to every single command — npm installs, file creation, scaffolding tools, everything. The user is learning and needs to understand every action taken in their project.