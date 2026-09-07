# AI Web Boilerplate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a TypeScript monorepo boilerplate for an AI web project with three parallel LangChain agents (Frontend, Backend, Cybersecurity Analyst) orchestrated via LangGraph, an Express + SQLite backend, and a React + Vite frontend.

**Architecture:** Three LangChain agents live in top-level `agents/`. A LangGraph `StateGraph` in `AIarchitecture/graph.ts` fans out the user input to all three agents concurrently, then fans in to an aggregator that synthesizes results. The Express backend exposes a `POST /api/agents/run` endpoint and initializes a SQLite database (users/auth). The React frontend posts input to that endpoint and displays each agent's result.

**Tech Stack:** TypeScript, npm, React + Vite, Express, better-sqlite3/bcryptjs, @langchain/core, @langchain/langgraph.

---

## Project Setup Decisions

- npm workspaces used to manage `agents`, `AIarchitecture`, `backend`, `frontend` as a monorepo.
- Agents must be LLM-provider agnostic. The boilerplate uses an env-configured model. To keep the boilerplate runnable without a paid key by default, agents use LangChain's mock/placeholder via `@langchain/core`'s `FakeListChatModel` when `LLM_API_KEY` is absent, and a real model (e.g. OpenAI via `@langchain/openai`) when present. The agent factory checks `process.env.LLM_API_KEY`.
- Root `.gitignore` ignores `node_modules`, `dist`, `.env`, `data.db`, `.superpowers`.

---

### Task 1: Root workspace & gitignore

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `README.md`

- [ ] **Step 1: Create root `package.json`**

```json
{
  "name": "af-test-boilerplate",
  "version": "0.1.0",
  "private": true,
  "workspaces": [
    "agents",
    "AIarchitecture",
    "backend",
    "frontend"
  ],
  "scripts": {
    "build": "npm run build -w backend",
    "dev": "npm run dev -w backend"
  }
}
```

- [ ] **Step 2: Create `.gitignore`**

```gitignore
node_modules/
dist/
.env
*.db
.superpowers/
```

- [ ] **Step 3: Create `README.md`**

```markdown
# AF-test Boilerplate

AI web project boilerplate with three parallel LangChain agents (Frontend,
Backend, Cybersecurity Analyst) orchestrated via LangGraph, an Express + SQLite
backend, and a React + Vite frontend.

## Structure

- `agents/` - LangChain agents (front, back, security) + `agents.MD`
- `AIarchitecture/` - LangGraph parallel (fan-out/fan-in) orchestration
- `backend/` - Express server + SQLite (users/auth)
- `frontend/` - React + Vite app

## Getting started

See `agents/agents.MD` and the `backend/`/`frontend/` READMEs.
```

- [ ] **Step 4: Verify install works**

Run: `npm install`
Expected: installs successfully (no workspace errors). If it errors, resolve the workspace paths.

- [ ] **Step 5: Commit**

```bash
git add package.json .gitignore README.md package-lock.json
git commit -m "chore: init npm workspace root"
```

---

### Task 2: Agents shared types & factory

**Files:**
- Create: `agents/types.ts`
- Create: `agents/llm.ts`
- Create: `agents/index.ts`

- [ ] **Step 1: Write shared types** — Create `agents/types.ts`

```ts
export interface AgentResult {
  agent: string;
  content: string;
  meta?: Record<string, unknown>;
}

export interface Agent {
  name: string;
  invoke(input: string): Promise<AgentResult>;
}
```

- [ ] **Step 2: Write LLM factory** — Create `agents/llm.ts`

```ts
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { FakeListChatModel } from "@langchain/core/utils/testing";
import { ChatOpenAI } from "@langchain/openai";

export function getChatModel(): BaseChatModel {
  if (process.env.LLM_API_KEY) {
    return new ChatOpenAI({
      model: process.env.LLM_MODEL ?? "gpt-4o-mini",
      apiKey: process.env.LLM_API_KEY,
    });
  }
  // Stub responses so the boilerplate runs without a key.
  return new FakeListChatModel({
    responses: [
      "Analyzed the request from my perspective and produced a summary.",
    ],
  });
}
```

- [ ] **Step 3: Write agents barrel** — Create `agents/index.ts`

```ts
export * from "./types";
export { getChatModel } from "./llm";
export { frontAgent } from "./frontAgent";
export { backAgent } from "./backAgent";
export { securityAgent } from "./securityAgent";
```

- [ ] **Step 4: Install agent deps**

Run: `npm install langchain @langchain/core @langchain/openai @langchain/langgraph -w agents`
Expected: installs cleanly.

- [ ] **Step 5: Commit**

```bash
git add agents/
git commit -m "feat(agents): add shared types and LLM factory"
```

---

### Task 3: The three agents

**Files:**
- Create: `agents/frontAgent.ts`
- Create: `agents/backAgent.ts`
- Create: `agents/securityAgent.ts`
- Create: `agents/agents.MD`

- [ ] **Step 1: Frontend agent** — Create `agents/frontAgent.ts`

```ts
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Agent, AgentResult } from "./types";
import { getChatModel } from "./llm";

const SYSTEM = `You are a senior frontend engineer. Help with React, UI/UX,
DOM, styling, and frontend testing. Be concrete: show code and explain trade-offs.
If given a bug, ask to reproduce; otherwise give a debugging/testing/documentation
response.`;

const prompt = ChatPromptTemplate.fromMessages([
  ["system", SYSTEM],
  ["human", "{input}"],
]);

export const frontAgent: Agent = {
  name: "frontend",
  async invoke(input: string): Promise<AgentResult> {
    const model = getChatModel();
    const chain = prompt.pipe(model);
    const res = await chain.invoke({ input });
    return { agent: this.name, content: String(res.content) };
  },
};
```

- [ ] **Step 2: Backend agent** — Create `agents/backAgent.ts`

```ts
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Agent, AgentResult } from "./types";
import { getChatModel } from "./llm";

const SYSTEM = `You are a senior backend engineer. Help with Express, Node,
APIs, data modeling, and backend testing. Give concrete, idiomatic code and
explain trade-offs.`;

const prompt = ChatPromptTemplate.fromMessages([
  ["system", SYSTEM],
  ["human", "{input}"],
]);

export const backAgent: Agent = {
  name: "backend",
  async invoke(input: string): Promise<AgentResult> {
    const model = getChatModel();
    const chain = prompt.pipe(model);
    const res = await chain.invoke({ input });
    return { agent: this.name, content: String(res.content) };
  },
};
```

- [ ] **Step 3: Cybersecurity analyst** — Create `agents/securityAgent.ts`

```ts
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Agent, AgentResult } from "./types";
import { getChatModel } from "./llm";

const SYSTEM = `You are a cybersecurity analyst. Review code and architecture
for security vulnerabilities (OWASP). Output structured findings with severity,
description, affected area, and remediation. If nothing is amiss, say so
clearly.`;

const prompt = ChatPromptTemplate.fromMessages([
  ["system", SYSTEM],
  ["human", "{input}"],
]);

export const securityAgent: Agent = {
  name: "security",
  async invoke(input: string): Promise<AgentResult> {
    const model = getChatModel();
    const chain = prompt.pipe(model);
    const res = await chain.invoke({ input });
    return { agent: this.name, content: String(res.content) };
  },
};
```

- [ ] **Step 4: Write `agents/agents.MD`**

```markdown
# Agents

Three LangChain agents help with development tasks: debugging, testing, and
documentation, plus a security-review perspective.

## Frontend Agent (`frontAgent.ts`)
- Role: React/components, UI/UX, DOM, styling, frontend tests.
- Invoke: `frontAgent.invoke(input)` returns `{ agent, content, meta? }`.

## Backend Agent (`backAgent.ts`)
- Role: Express/Node, APIs, data modeling, backend tests.
- Invoke: `backAgent.invoke(input)` returns `{ agent, content, meta? }`.

## Cybersecurity Analyst (`securityAgent.ts`)
- Role: OWASP-focused security review; structured findings.
- Invoke: `securityAgent.invoke(input)` returns `{ agent, content, meta? }`.

## Configuration
- Set `LLM_API_KEY` to use a real model (see `LLM_MODEL`).
- Without it, agents return a stub response so the boilerplate runs offline.

## Adding an agent
1. Create `myAgent.ts` exporting an `Agent` (name + `invoke`).
2. Export it from `index.ts`.
3. Add it as a node in `AIarchitecture/graph.ts` (see that module's README).
```

- [ ] **Step 5: Typecheck agents**

Run: `npx tsc --noEmit -p agents/tsconfig.json` (create `agents/tsconfig.json` if not present; see Step 6)
Expected: no errors.

- [ ] **Step 6: Add a minimal `agents/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["*.ts"]
}
```

- [ ] **Step 7: Commit**

```bash
git add agents/
git commit -m "feat(agents): add front, back, security agents and agents.MD"
```

---

### Task 4: LangGraph parallel architecture

**Files:**
- Create: `AIarchitecture/package.json`
- Create: `AIarchitecture/tsconfig.json`
- Create: `AIarchitecture/index.ts`
- Create: `AIarchitecture/graph.ts`

- [ ] **Step 1: Create `AIarchitecture/package.json`**

```json
{
  "name": "aiarchitecture",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc"
  }
}
```

- [ ] **Step 2: Create `AIarchitecture/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "outDir": "dist"
  },
  "include": ["*.ts"]
}
```

- [ ] **Step 3: Create `AIarchitecture/graph.ts` with fan-out of three agents and an aggregator**

```ts
import { StateGraph, END, Annotation } from "@langchain/langgraph";
import {
  frontAgent,
  backAgent,
  securityAgent,
  AgentResult,
} from "agents";

const GraphState = Annotation.Root({
  input: Annotation<string>({
    reducer: (_, b) => b,
  }),
  results: Annotation<AgentResult[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
  summary: Annotation<string>({
    reducer: (_, b) => b,
    default: () => "",
  }),
});

function orchestrator(state: typeof GraphState.State) {
  return { input: state.input.trim() };
}

async function runFront(state: typeof GraphState.State) {
  const r = await frontAgent.invoke(state.input);
  return { results: [r] };
}

async function runBack(state: typeof GraphState.State) {
  const r = await backAgent.invoke(state.input);
  return { results: [r] };
}

async function runSecurity(state: typeof GraphState.State) {
  const r = await securityAgent.invoke(state.input);
  return { results: [r] };
}

function aggregator(state: typeof GraphState.State) {
  const parts = state.results.map(
    (r) => `## ${r.agent}\n${r.content}`
  );
  return { summary: parts.join("\n\n---\n\n") };
}

const builder = new StateGraph(GraphState)
  .addNode("orchestrator", orchestrator)
  .addNode("front", runFront)
  .addNode("back", runBack)
  .addNode("security", runSecurity)
  .addNode("aggregator", aggregator)
  .addEdge("__start__", "orchestrator")
  .addEdge("orchestrator", "front")
  .addEdge("orchestrator", "back")
  .addEdge("orchestrator", "security")
  .addEdge("front", "aggregator")
  .addEdge("back", "aggregator")
  .addEdge("security", "aggregator")
  .addEdge("aggregator", END);

export const app = builder.compile();

export async function invokeGraph(
  input: string
): Promise<{ results: AgentResult[]; summary: string }> {
  const final = await app.invoke({ input });
  return { results: final.results, summary: final.summary };
}
```

- [ ] **Step 4: Create `AIarchitecture/index.ts`**

```ts
export { app, invokeGraph } from "./graph.js";
export type { AgentResult } from "agents";
```

- [ ] **Step 5: Install langgraph dep**

Run: `npm install @langchain/langgraph -w AIarchitecture`
Expected: installs cleanly.

- [ ] **Step 6: Build the AIarchitecture package**

Run: `npm run build -w AIarchitecture`
Expected: `tsc` compiles without errors and emits `dist/`.

- [ ] **Step 7: Commit**

```bash
git add AIarchitecture/
git commit -m "feat(aiarchitecture): add LangGraph fan-out/fan-in parallel graph"
```

---

### Task 5: Backend (Express + SQLite + endpoint)

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/src/index.ts`
- Create: `backend/src/db.ts`
- Create: `backend/src/routes/agents.ts`

- [ ] **Step 1: Create `backend/package.json`**

```json
{
  "name": "backend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc"
  }
}
```

- [ ] **Step 2: Create `backend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `backend/src/db.ts` (SQLite users/auth)**

```ts
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const db = new Database(process.env.DB_PATH ?? "data.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export function createUser(email: string, password: string) {
  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)")
    .run(email, hash);
  return { id: info.lastInsertRowid, email };
}

export function getUser(email: string) {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email);
}

export default db;
```

- [ ] **Step 4: Create `backend/src/routes/agents.ts`**

```ts
import { Router } from "express";
import { invokeGraph } from "aiarchitecture";

export const agentsRouter = Router();

agentsRouter.post("/run", async (req, res) => {
  const input: unknown = req.body?.input;
  if (typeof input !== "string" || input.trim().length === 0) {
    res.status(400).json({ error: "input is required and must be a non-empty string" });
    return;
  }
  try {
    const { results, summary } = await invokeGraph(input);
    res.json({ results, summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "agent orchestration failed", detail: String(err) });
  }
});
```

- [ ] **Step 5: Create `backend/src/index.ts`**

```ts
import express from "express";
import cors from "cors";
import { agentsRouter } from "./routes/agents.js";
import { createUser } from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/register", (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "email and password required" });
    return;
  }
  try {
    const user = createUser(email, password);
    res.status(201).json({ user });
  } catch (err) {
    res.status(409).json({ error: "user already exists", detail: String(err) });
  }
});

app.use("/api/agents", agentsRouter);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
```

- [ ] **Step 6: Install backend deps**

Run: `npm install express cors better-sqlite3 bcryptjs -w backend && npm install typescript tsx @types/express @types/cors @types/better-sqlite3 @types/bcryptjs -w backend -D`
Expected: installs cleanly. (Requires native build for better-sqlite3; needs a C++ toolchain present.)

- [ ] **Step 7: Build backend**

Run: `npm run build -w backend`
Expected: `tsc` compiles without errors.

- [ ] **Step 8: Smoke-test the server**

Run: `node backend/dist/index.js & sleep 2 && curl -s http://localhost:4000/health && curl -s -X POST http://localhost:4000/api/agents/run -H 'Content-Type: application/json' -d '{"input":"review this endpoint"}' && kill %1`
Expected: `/health` returns `{"ok":true}` and `/api/agents/run` returns a JSON object with `results` (3 items) and `summary`. Verify `data.db` file got created.

- [ ] **Step 9: Commit**

```bash
git add backend/
git commit -m "feat(backend): Express server, SQLite auth scaffold, agents endpoint"
```

---

### Task 6: Frontend (React + Vite)

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/styles.css`

- [ ] **Step 1: Create `frontend/package.json`**

```json
{
  "name": "frontend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.5.4",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create `frontend/vite.config.ts`**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 3: Create `frontend/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AI Boilerplate</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Create `frontend/src/main.tsx`**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 5: Create `frontend/src/App.tsx`**

```tsx
import { useState } from "react";

interface AgentResult {
  agent: string;
  content: string;
  meta?: Record<string, unknown>;
}
interface RunResponse {
  results: AgentResult[];
  summary: string;
}

export default function App() {
  const [input, setInput] = useState("");
  const [data, setData] = useState<RunResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "sans-serif" }}>
      <h1>AI Boilerplate</h1>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask the parallel agents something (e.g. review this code...)"
        rows={5}
        style={{ width: "100%", fontFamily: "monospace" }}
      />
      <button onClick={run} disabled={loading || !input.trim()}>
        {loading ? "Running..." : "Run agents"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {data && (
        <div>
          <h2>Summary</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>{data.summary}</pre>
          <h2>Per-agent results</h2>
          {data.results.map((r) => (
            <section key={r.agent} style={{ border: "1px solid #ccc", padding: 12, marginBottom: 12 }}>
              <h3>{r.agent}</h3>
              <pre style={{ whiteSpace: "pre-wrap" }}>{r.content}</pre>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 6: Create `frontend/src/styles.css`**

```css
body { margin: 0; background: #f6f7f9; color: #222; }
```

- [ ] **Step 7: Create `frontend/tsconfig.json` and `tsconfig.node.json`**

`frontend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true
  },
  "include": ["src"]
}
```

`frontend/tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 8: Install + build frontend**

Run: `npm install -w frontend && npm run build -w frontend`
Expected: `tsc && vite build` completes without errors, producing `frontend/dist/`.

- [ ] **Step 9: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): React + Vite app sending input to parallel agents"
```

---

### Task 7: Root verification & final commit

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update `README.md` with run instructions**

Append to `README.md`:

```markdown
## Run

0. `npm install`
1. Start backend: `npm run dev` (serves on http://localhost:4000)
2. Start frontend: `npm run dev -w frontend` (serves on http://localhost:5173)
3. Open http://localhost:5173 — the dev proxy forwards `/api` to the backend.

## Config

- `LLM_API_KEY` (+ optional `LLM_MODEL`) enables real models. Without it,
  agents return stub responses so the app still runs end-to-end.
- `PORT` backend port (default 4000). `DB_PATH` sqlite path (default `data.db`).
```

- [ ] **Step 2: Verify full builds**

Run: `npm run build`
Expected: backend builds (and workspace packages compile) without errors. Then verify frontend build as in Task 6 Step 8.

- [ ] **Step 3: End-to-end smoke test (stub LLM)**

Run: backend `npm run dev` (or build+node), then `curl -s -X POST http://localhost:4000/api/agents/run -H 'Content-Type: application/json' -d '{"input":"debug this"}'`
Expected: returns `{ results: [3 items], summary }`.

- [ ] **Step 4: Final commit**

```bash
git add README.md
git commit -m "docs: add run instructions"
```

---

## Self-Review Notes

This plan was checked against the spec:
- Agents in top-level `agents/` (Tasks 2-3) ✓
- LangGraph parallel implementation in top-level `AIarchitecture/` (Task 4) ✓
- SQLite for users/auth (Task 5) ✓
- Express server + endpoint (Task 5) ✓
- React + Vite frontend + proxy (Task 6) ✓
- `agents/agents.MD` documentation (Task 3) ✓
- Error handling: per-endpoint try/catch, input validation (Task 5) ✓
- Out of scope respected: stub LLM when no key, no session management, no Docker ✓
