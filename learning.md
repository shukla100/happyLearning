# learning.md

A running log of concepts learned while building happyLearning. One paragraph per concept — keep it short.

---

**What Node.js is (2026-06-05)**
JavaScript was built to run inside browsers — Node.js lets it run outside the browser, on your machine or a server. It reads your file once at startup and holds everything in memory, which is why changing a file does nothing until you restart it.

**How Vite watches for changes (2026-06-05)**
Vite watches your project files using the OS's file-change notifications. The moment you save a `.jsx` or `.css` file, Vite recompiles it and pushes the update into your browser instantly over a live connection — no page reload needed. This is called Hot Module Replacement (HMR). Node has none of this; it's a plain runtime, not a development tool.

**Dev servers and hot-reload (2026-06-05)**
When developing, two PowerShell windows must be open and running simultaneously — one for the frontend (Vite) on port 5173, one for the backend (Node.js) on port 3001. A port is like a door number on your computer; different programs listen on different doors, and `localhost` just means "this machine, not the internet." If you change a frontend file, Vite detects it and updates the browser automatically — no restart needed. If you change a backend file, restart it manually: `Ctrl+C` in the backend window, then `node index.js` again. If either window closes or crashes, start it again yourself — hot-reload only works when the process is already running.

**React components and props (2026-06-12)**
A React component is just a JavaScript function that returns UI. You break your app into components — each one owns a small piece of the screen. Components can talk to each other by passing props, which are just function arguments with a different name. A parent component (like App.jsx) can pass a function down to a child component (like LearningMap.jsx) as a prop, and the child can call it. This is how the "Explore again" button in the learning map panel is able to trigger an exploration — LearningMap doesn't own the explore logic, App.jsx does, but it hands it down via a prop called `onExplore`.

**Trees vs graphs (2026-06-12)**
A tree is a specific type of graph where every node has exactly one parent (except the root, which has none). Your session exploration is a tree — you start somewhere and branch downward. A graph is more general: any node can connect to any other node in any direction. Your learning map is a graph — OAuth can connect to JWT, which can also connect to session management, without any single "root." The two need different libraries: `react-d3-tree` for trees (strict hierarchy), `react-force-graph-2d` for graphs (arbitrary connections).

**Force-directed graphs (2026-06-12)**
react-force-graph-2d uses a physics simulation to position nodes — it pretends nodes repel each other like magnets and edges pull connected nodes together, then lets the system settle. The result is a layout where connected concepts naturally cluster. The simulation runs in the background (`warmupTicks`) before anything is drawn, so nodes appear already in their final positions. `zoomToFit()` is then called to make sure all nodes are visible.

**Fire-and-forget async functions (2026-06-12)**
When you `await` a function, your code stops and waits for it to finish before moving on. When you call a function without `await`, it starts running but your code immediately continues — the function finishes whenever it finishes, in the background. This is called fire-and-forget. The semantic inference call in the backend uses this pattern: the explanation is sent to the frontend first (`res.json(...)`), then inference starts without awaiting. The user gets their answer immediately and the background work completes a second or two later without them ever noticing.

**Environment variables in Vite (2026-06-15)**
Vite has a specific rule: only variables prefixed with `VITE_` get exposed to the browser. You define them in a `.env.local` file (which is gitignored) and access them in React code as `import.meta.env.VITE_API_URL`. This is different from how the backend accesses environment variables (`process.env.KEY`). The reason for the prefix rule: anything in your frontend code is visible to anyone who opens the browser devtools, so Vite forces you to explicitly opt in to exposing a variable rather than accidentally leaking every env var.

**Callback refs in React (2026-06-15)**
A regular `useRef` gives you a ref object whose `.current` property gets set after the component renders. A callback ref is a function you pass as the `ref` prop — React calls it immediately when the DOM element is created, before any `useEffect` hooks fire. This timing difference matters when you need to configure something (like a D3 force simulation's charge strength) before the component runs its internal setup. In LearningMap.jsx, we use a callback ref to set the charge force on the graph before the warmup ticks run, so nodes are already spaced out when they first appear.

**D3 force simulation and node spacing (2026-06-15)**
The force-directed graph positions nodes using a physics simulation. Nodes have a "charge" force (repulsion — like magnets pushing apart) and a "link" force (attraction — edges pull connected nodes together). The default charge strength is -30, which is weak — nodes cluster tightly. Increasing it to -80 or -200 pushes nodes further apart. `warmupTicks` controls how many simulation steps run invisibly before the graph renders; `cooldownTicks={0}` stops the simulation immediately after warmup so there's no visible animation. `zoomToFit()` then scales the camera so all nodes are visible regardless of how spread out they are.

**Deployment: frontend on Vercel, backend on Render (2026-06-15)**
Deploying a full-stack app means putting the two halves on separate hosting platforms — one for the React frontend, one for the Node.js backend. Vercel specialises in frontend hosting: you connect your GitHub repo, it builds the React app and serves it from a global CDN. Render hosts the backend: your Node.js server runs as a persistent process on their infrastructure. The frontend's `VITE_API_URL` environment variable is what tells the deployed frontend to talk to Render instead of localhost. When developing locally, `.env.local` points it back to `http://localhost:3001` so your personal use never touches the deployed backend.
