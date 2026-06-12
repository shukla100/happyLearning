# happyLearning — Infrastructure

This file documents how the project is structured, what each piece does, and why we chose it.

---

## How the pieces fit together

```
Browser (you)
    ↕
Frontend — React + Vite        (runs on port 5173)
    ↕
Backend — Node.js + Express    (runs on port 3001)
    ↕
Claude API (Anthropic)
```

You interact with the frontend in your browser. The frontend talks to the backend. The backend talks to Claude. The response travels back the same way.

A **port** is like a door number on your computer. Different programs listen on different doors. The frontend listens on 5173, the backend on 3001. When they talk to each other, they knock on the right door.

---

## Frontend

**Location:** `happyLearning/frontend/`

**What it is:** Everything you see and interact with in the browser. The input box, the tree visualization, the buttons. This is the face of the app.

**Language:** JavaScript

### React

React is a JavaScript library for building user interfaces. The core idea is that your UI is made of **components** — small, reusable building blocks. A button is a component. A node in the tree is a component. The whole page is a component made of smaller components.

The reason React exists is to solve a hard problem: when data changes, the screen needs to update. Without React, you'd have to manually find the right element in the browser and update it yourself — messy and error-prone at scale. React watches your data and automatically re-renders only the parts of the screen that changed.

Think of it like a live document: you update the data, React figures out what needs to redraw.

### Vite

Vite is the tool that powers your development environment. It does two things:

1. **Runs a local dev server** — when you type `npm run dev`, Vite starts a server on your machine so you can open the app in your browser at `localhost:5173`. This is not on the internet — it's only on your computer.
2. **Bundles the app for production** — when you're ready to deploy someday, Vite packages all your React code into optimised files a browser can load fast.

Vite is not something you write code in. It works in the background. You mostly forget it's there.

### Key frontend files

| File | What it is |
|---|---|
| `frontend/src/main.jsx` | The entry point — where React starts and attaches to the browser page |
| `frontend/src/App.jsx` | The root component — holds all state, all logic, renders everything |
| `frontend/src/NeuralBackground.jsx` | Animated neural-network canvas drawn in the background |
| `frontend/src/TreeView.jsx` | Renders the current session as a vertical tree using `react-d3-tree` |
| `frontend/src/LearningMap.jsx` | Renders the full cross-session learning map using `react-force-graph-2d` |
| `frontend/index.html` | The single HTML page the whole app lives inside |
| `frontend/package.json` | The list of packages the frontend needs |

### Frontend packages installed

| Package | What it does |
|---|---|
| `react-d3-tree` | Draws the current session as a hierarchical tree (parent → child layout) |
| `react-force-graph-2d` | Draws the learning map as a force-directed graph (arbitrary connections between nodes) |

---

## Backend

**Location:** `happyLearning/backend/`

**What it is:** A small server that runs on your machine. The frontend can't call Claude directly (that would expose your API key in the browser). So the frontend sends a request to the backend, the backend calls Claude with your secret key, and returns the result.

**Language:** JavaScript (Node.js)

### Node.js

Node.js is JavaScript running outside the browser. JavaScript was originally invented to run only inside browsers — Node.js took the same language and made it possible to run on a server (or your local machine). This is why we can use one language for both frontend and backend.

The backend is a Node.js program. When you run `node index.js`, Node.js executes that file as a server process — it stays running, waiting for requests.

### Express

Express is a framework built on top of Node.js that makes creating a server simple. Without Express, setting up even a basic server in raw Node.js takes a lot of verbose code. Express gives you clean, readable tools.

The core concept in Express is a **route** — a combination of an address and an action. For example:

```
POST /explore  →  call Claude with the concept, return explanation + branches
```

When the frontend sends data to `/explore`, Express knows to run that specific block of code.

### Key backend files

| File | What it is |
|---|---|
| `backend/index.js` | The server — loads config, defines all routes, runs semantic inference |
| `backend/storage.js` | All read/write logic for sessions and brain.json — never called directly by the frontend |
| `backend/brain.json` | The persistent memory store — all concepts, connections, depth scores, learning gaps |
| `backend/sessions/` | One JSON file per session — stores every node explored, its explanation, and follow-up questions |
| `backend/package.json` | The list of packages the backend needs |

### Backend packages installed

| Package | What it does |
|---|---|
| `express` | The web server framework |
| `dotenv` | Reads `.env` and makes secrets available to the code |
| `cors` | Allows the frontend (port 5173) to talk to the backend (port 3001) |
| `@anthropic-ai/sdk` | Anthropic's official JavaScript library for calling Claude |
| `@octokit/rest` | GitHub's official library — used to push session and brain files to GitHub on End Session |

### Backend routes

| Route | What it does |
|---|---|
| `POST /explore` | Main route — calls Claude Sonnet for explanation + branches, saves session node, updates brain, fires semantic inference in background |
| `POST /followup` | Calls Claude for a follow-up answer, extracts concepts, saves to session node, updates brain as learning gap |
| `POST /end-session` | Pushes the current session JSON and brain.json to GitHub via Octokit |
| `GET /sessions` | Returns all saved sessions sorted newest first |
| `GET /brain` | Returns the full brain.json |
| `GET /concept/:name` | Looks up a concept across all sessions and returns its explanation + all follow-up questions |

---

## The brain system

`brain.json` is the app's long-term memory. It is updated on every exploration and follow-up question. It tracks:

- **Every concept explored** — when first seen, how many times, which sessions it appeared in
- **Depth score (0–1)** — calculated from: explored directly (0.4) + follow-up questions asked (0.15 each, capped at 0.4) + appeared in multiple sessions (0.2)
- **How it was encountered** — `main` (directly explored), `branch` (suggested but not clicked), `followup-extracted` (surfaced in a question)
- **Connections** — directional links between concepts the user navigated between, plus semantically inferred links (see below)
- **Learning gaps** — concepts that came up in follow-up questions but were never directly explored
- **Recommended next** — auto-generated list of 8 concepts worth exploring next, based on gaps and unseen branches

Every time Claude is called, `buildBrainContext()` in `storage.js` turns `brain.json` into a plain-English summary that gets sent as the system prompt. This means Claude always knows what the learner already understands deeply, what they've only touched, and what their gaps are.

## Semantic inference

After every exploration, a background call to Claude Haiku runs (`inferSemanticConnections`). It asks: "which of the user's already-explored concepts are tightly related to this new one?" The response is used to draw edges in the learning map between concepts that are directly related — even if the user never navigated between them explicitly. This runs after `res.json()` so the user never waits for it.

## The learning map vs the session tree

There are two visualizations in the app — they serve different purposes:

| | Session tree (`TreeView.jsx`) | Learning map (`LearningMap.jsx`) |
|---|---|---|
| What it shows | The path through the current session only | All concepts explored across all sessions |
| Library | `react-d3-tree` | `react-force-graph-2d` |
| Shape | Strict hierarchy — parent above children | Free-form graph — nodes float, connections are arbitrary |
| Connections | Only navigation order (node 1 → 2 → 3) | Explicit navigation + semantic inference |
| Appears when | During an active session (when result is showing) | On the home page (when no result is showing) |
| Clickable | No | Yes — click to see explanation, real-world example, follow-up questions, and re-explore |

## How a node is born and what connects them

Every node starts the same way — something triggers the `explore()` function in the frontend. That function calls the `POST /explore` route on the backend, which sends the concept to Claude and gets back `{ explanation, realWorldExample, branches }`. The frontend stores that response in a piece of state called `result`, and React immediately redraws the screen to show it. At the same time, the concept gets added to a second piece of state called `history`, which powers the breadcrumb trail at the top.

Three things can trigger `explore()` and therefore create a new node: typing in the top search bar, clicking a branch button, or submitting the "based on this" field at the bottom (which also passes the current concept as `context` to the route, so Claude connects the two). Each time, `result` is replaced and `history` grows by one.

Two things do NOT create a new node: the follow-up question box calls `POST /followup` instead, which only updates `followUpAnswer` state — the current node stays untouched. Clicking a history item re-calls `explore()` on a past concept, which does replace the node but doesn't add a duplicate to history.

---

## Environment & Secrets

**Location:** `happyLearning/.env`

Stores the Anthropic API key. This file is listed in `.gitignore` and will never be committed to git. The backend loads it on startup via `dotenv`.

```
ANTHROPIC_API_KEY=your_key_here
```

---

## What's running when you develop

| Command | Where to run | What it does |
|---|---|---|
| `node index.js` | `backend/` | Starts the backend server on port 3001 |
| `npm run dev` | `frontend/` | Starts the frontend dev server on port 5173 |

Both need to be running at the same time for the app to work. Think of them as two engines — the car doesn't move if either one is off.
