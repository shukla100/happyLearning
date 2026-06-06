# learning.md

A running log of concepts learned while building happyLearning. One paragraph per concept — keep it short.

---

**What Node.js is (2026-06-05)**
JavaScript was built to run inside browsers — Node.js lets it run outside the browser, on your machine or a server. It reads your file once at startup and holds everything in memory, which is why changing a file does nothing until you restart it.

**How Vite watches for changes (2026-06-05)**
Vite watches your project files using the OS's file-change notifications. The moment you save a `.jsx` or `.css` file, Vite recompiles it and pushes the update into your browser instantly over a live connection — no page reload needed. This is called Hot Module Replacement (HMR). Node has none of this; it's a plain runtime, not a development tool.

**Dev servers and hot-reload (2026-06-05)**
When developing, two PowerShell windows must be open and running simultaneously — one for the frontend (Vite) on port 5173, one for the backend (Node.js) on port 3001. A port is like a door number on your computer; different programs listen on different doors, and `localhost` just means "this machine, not the internet." If you change a frontend file, Vite detects it and updates the browser automatically — no restart needed. If you change a backend file, restart it manually: `Ctrl+C` in the backend window, then `node index.js` again. If either window closes or crashes, start it again yourself — hot-reload only works when the process is already running.
