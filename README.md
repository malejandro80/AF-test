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

## Run

0. `npm install`
1. Start backend: `npm run dev` (serves on http://localhost:4000)
2. Start frontend: `npm run dev -w frontend` (serves on http://localhost:5173)
3. Open http://localhost:5173 — the dev proxy forwards `/api` to the backend.

## Config

- `LLM_API_KEY` (+ optional `LLM_MODEL`) enables real models. Without it,
  agents return stub responses so the app still runs end-to-end.
- `PORT` backend port (default 4000). `DB_PATH` sqlite path (default `data.db`).