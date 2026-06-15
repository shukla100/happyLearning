# happyLearning

  **happyLearning is a personal AI-powered learning companion that maps your curiosity —
  you follow topics wherever your mind goes, and it builds a visual brain map of 
  everything you've explored, remembers it across sessions, and gets smarter about what
  you know and don't know over time.**

  ---

  ## What it does

  You type any concept, get an expert-level explanation tailored to what you already
  know, choose from branching related topics to keep exploring, ask follow-up questions,
  and end the session to save the whole thing permanently to GitHub.

  Every session builds on the last. The app tracks which topics you've explored deeply,
  which ones you've only skimmed, what gaps keep showing up in your questions, and how
  concepts connect across your entire learning history. Claude reads all of this before
  responding — so it never starts from scratch.

  ## The value

  Three things:

  1. **A thinking partner that knows you** — not a tutor, not a chatbot. A highly
  skilled engineer who remembers everything you've ever asked and builds on it.
  2. **A visual map of how your mind works** — not a list of notes, but a live graph of
  how your curiosity connected topics over time.
  3. **A working AI-powered product you built** — full-stack React + Node.js + Claude
  API with persistent memory, GitHub backup, and a real use case.

  ## Deployment

  The app is live for portfolio visitors:

  - **Frontend:** Vercel — https://happy-learning-product.vercel.app
  - **Backend:** Render — https://happylearning-api.onrender.com

  The deployed version runs on pre-seeded demo data (`brain.seed.json` +
  `sessions.seed/`) so the learning map and node panels are fully populated on
  first load. Personal daily use runs locally — local data never touches the
  deployed environment.

  ## Running locally — preferred for personal daily use

  Running locally is the intended experience for personal learning. Your session
  history, brain.json memory, and learning map are all stored on your machine and
  are completely separate from the deployed demo. `brain.json` and `sessions/` are
  gitignored — your personal learning data never gets pushed to GitHub or shared
  with the deployed version.

  ```
  # Terminal 1 — backend
  cd backend
  node index.js

  # Terminal 2 — frontend
  cd frontend
  npm run dev
  ```

  Open http://localhost:5173 in your browser.

  Requires a `.env` file in the project root with `ANTHROPIC_API_KEY`,
  `GITHUB_TOKEN`, and `GITHUB_SESSIONS_REPO`, and a `frontend/.env.local` with
  `VITE_API_URL=http://localhost:3001`.
