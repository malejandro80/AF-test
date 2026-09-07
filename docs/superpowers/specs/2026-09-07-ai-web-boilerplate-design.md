# AI Web Project Boilerplate — Design

**Date:** 2026-09-07
**Status:** Approved

## Overview

A TypeScript monorepo boilerplate for an AI web project featuring three development assistant agents (Frontend, Backend, Cybersecurity Analyst) that run concurrently via a LangGraph parallel architecture.

## Purpose

Provide a working skeleton developers can clone to start an AI-assisted web project. The agents help with development tasks: debugging, testing, and documentation. A cybersecurity analyst agent adds a security-review perspective.

## Stack

- **Language:** TypeScript (both frontend & backend)
- **Package manager:** npm
- **Frontend:** React + Vite
- **Backend:** Express (Node)
- **Database:** SQLite via `better-sqlite3` (used for users/auth data)
- **Agent framework:** LangChain.js + LangGraph.js

## Directory Structure

```
AF-test/
├── .gitignore
├── README.md
├── agents/                        ← personae + agent logic (shared, framework-agnostic)
│   ├── agents.MD                  ← agent documentation
│   ├── frontAgent.ts              ← LangChain-based agent
│   ├── backAgent.ts               ← LangChain-based agent
│   └── securityAgent.ts           ← LangChain-based agent
├── AIarchitecture/               ← LangGraph parallel architecture
│   └── graph.ts                  ← orchestration: orchestrator → fan-out → 3 agents → aggregator
├── backend/                       ← Express server
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts               ← Express bootstrap + routes
│       └── db.ts                  ← SQLite setup, schema, and helpers
│           (imports graph from AIarchitecture; agents from agents/)
└── frontend/                      ← React + Vite app
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts             ← dev proxy to backend
    └── src/
        ├── main.tsx
        ├── App.tsx
        └── ...
```

## Agents

Each agent is a LangChain agent (using `ChatPromptTemplate` + an LLM) with its own system persona and, where useful, tools. Agents live in the top-level `agents/` folder so they can be reused across runtimes and by the parallel architecture.

### Frontend Agent (`frontAgent.ts`)
- **Role:** Assists with frontend development — React components, UI/UX, DOM/styling.
- **Input:** user request (e.g., debug a component, write a test, document a hook).
- **Output:** structured text with findings/recommendations/code snippets.

### Backend Agent (`backAgent.ts`)
- **Role:** Assists with backend development — Express routes, Node, APIs, data modeling.
- **Input:** user request (e.g., debug an endpoint, write a test, document an API).
- **Output:** structured text with findings/recommendations/code snippets.

### Cybersecurity Analyst (`securityAgent.ts`)
- **Role:** Reviews code/architecture for security vulnerabilities (OWASP focus).
- **Input:** user request or code snippet.
- **Output:** structured findings: severity, description, affected area, and remediation.

Each agent exports a consistent interface:
```ts
interface Agent {
  name: string;
  invoke(input: string): Promise<AgentResult>;
}
interface AgentResult {
  agent: string;
  content: string;
  meta?: Record<string, unknown>;
}
```

## Agents.MD

`agents/agents.MD` documents the agents — their roles, what each does, and how to use/extend them. Human-readable reference for the boilerplate.

## Parallel Architecture (AIarchitecture)

Uses LangGraph `StateGraph` for fan-out / fan-in parallel execution.

- **State:** typed `GraphState` carrying user input and per-agent results plus a final synthesized response.
- **Orchestrator node:** normalizes/prepares the shared input.
- **Fan-out:** one node edges to all three agent nodes concurrently (LangGraph runs sibling nodes in parallel).
- **Agent nodes:** `frontAgent`, `backAgent`, `securityAgent`.
- **Aggregator node:** collects the three `AgentResult`s and summarizes into a single final response.

### Data flow
```
User input
   ↓
Orchestrator node
   ↓            ↓            ↓
Front Agent  Back Agent  Security Agent   (run concurrently)
   ↓            ↓            ↓
Aggregator / Synthesizer
   ↓
Final response (per-agent results + combined summary)
```

`AIarchitecture/graph.ts` exports a compiled graph (`app`) and an `invokeGraph(input: string)` helper.

## Backend (Express + SQLite)

- **Express server** on a configurable port with CORS + JSON parsing.
- `/api/agents/run` POST endpoint:
  - request body: `{ input: string }`
  - runs `invokeGraph(input)`
  - responds with per-agent results + combined summary.
- **SQLite (`better-sqlite3`)** used for users/auth data:
  - `users` table: `id`, `email`, `password_hash`, `created_at`.
  - minimal auth scaffolding: registration endpoint that hashes a password (bcryptjs) and stores the user.
- Database file `backend/data.db`, created on boot; schema applied idempotently.

## Frontend (React + Vite)

- Standard Vite React TS scaffold.
- A single page with an input box to send a request to the backend `/api/agents/run` and display each agent's result.
- `vite.config.ts` dev proxy forwards `/api` to the backend so no CORS config is needed in dev.

## Error Handling

- Backend wraps graph invocation in try/catch and returns `500` with a JSON error if agent orchestration fails.
- Each agent node catches and returns a labeled error result so one failing agent does not crash the whole graph.
- Basic input validation: reject empty/missing `input`.

## Testing / Verification

- `npm run build` succeeds in `backend/` (tsc) and `frontend/` (tsc + vite build).
- `npm run dev` starts the backend; booting initializes the SQLite schema.
- Smoke test the `POST /api/agents/run` endpoint with test input where an LLM key is available (otherwise verify wiring with a stubbed agent).

## Out of Scope (YAGNI)

- No real LLM provider/key management (uses `process.env`, caller supplies a key; agents default to a stub that echoes/fails gracefully).
- No production auth/session management — only the registration scaffold.
- No deployment config (Docker, CI).
- No database for agent runs/conversation history (SQLite reserved for users/auth per decision).

## Decisions

- Agents live in top-level `agents/` (not `backend/`).
- LangGraph parallel implementation lives in top-level `AIarchitecture/`.
- SQLite used for users/auth data only.
