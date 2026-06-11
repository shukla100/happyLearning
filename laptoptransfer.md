# happyLearning — Quick Reference

## Starting the app on any given day

Every time you want to use happyLearning, open two terminal windows and run one command in each.

**Terminal 1 — Backend:**
```
cd C:\Users\garima.shukla\happyLearning\backend
node index.js
```

**Terminal 2 — Frontend:**
```
cd C:\Users\garima.shukla\happyLearning\frontend
npm run dev
```

Then open your browser at: http://localhost:5173

Both terminals need to stay open while you use the app. If the site loads but exploring a concept gives an error, it usually means the backend terminal isn't running.

---

# Transferring happyLearning to a New Laptop

## Before returning the old laptop

1. Make sure you have clicked **End Session** on any active learning session in the app.
   That's it. Everything else is already on GitHub.

---

## Setting up on a new laptop

### Step 1 — Install the basics
You need Node.js installed. Download it from nodejs.org (LTS version).

### Step 2 — Get the app code
Open a terminal and run:
```
git clone https://github.com/shukla100/happyLearning.git
```
This downloads all the app code from your personal GitHub.

### Step 3 — Get your learning data
Go to github.com/shukla100/happyLearning-sessions and download the repo.
Copy these two things into your new happyLearning folder:
- The entire `sessions/` folder → paste into `happyLearning/backend/sessions/`
- `brain.json` → paste into `happyLearning/backend/brain.json`

### Step 4 — Create your .env file
Inside the `happyLearning/` folder, create a file called `.env` with these three lines:
```
ANTHROPIC_API_KEY=your_anthropic_key_here
GITHUB_TOKEN=your_github_token_here
GITHUB_SESSIONS_REPO=shukla100/happyLearning-sessions
```
Your Anthropic API key is at console.anthropic.com
Your GitHub token — generate a new one at github.com → Settings → Developer settings → Personal access tokens → Tokens (classic). Tick the `repo` scope.

### Step 5 — Install dependencies
In the terminal, run these one at a time:
```
cd happyLearning/backend
npm install

cd ../frontend
npm install
```

### Step 6 — Start the app
Two terminal windows needed — one for each:

Terminal 1 (backend):
```
cd happyLearning/backend
node index.js
```

Terminal 2 (frontend):
```
cd happyLearning/frontend
npm run dev
```

Then open your browser at: http://localhost:5173

---

## You're done. All your past sessions and brain data will be there.

