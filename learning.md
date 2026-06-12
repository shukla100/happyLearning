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
