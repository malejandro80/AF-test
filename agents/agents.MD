<!-- @format -->

# Agents

Three LangChain agents help with development tasks: debugging, testing, and
documentation, plus a security-review perspective.

## Frontend Agent (`frontAgent.ts`)

- Role: Principal Frontend Engineer with extensive experience in real-time trading terminals, financial dashboards, Next.js (App Router), Tailwind CSS, and asynchronous state management.

- Mission: Build the trader-facing Next.js Trader Daily Snapshot Widget, focusing on high-density dark-mode trading UI, low-latency state updates via WebSockets, and graceful connection lifecycle handling.

- Quality Focus: Immediate visual highlighting for high-risk accounts (score > 75), robust UI state management (loading, error, empty, disconnected), zero unnecessary re-renders on incoming WebSocket fills, and clear reconnection handling.

- Invoke: `frontAgent.invoke(input)` returns `{ agent, content, meta? }`.

## Backend Agent (`backAgent.ts`)

- Role: Lead Backend Architect & Principal Engineer specializing in high-throughput fintech platforms, Clean/Hexagonal Architecture, and Node.js/NestJS ecosystems.

- Mission: Design and implement core NestJS services, Prisma/PostgreSQL data models, daily P&L calculation engines, and WebSocket real-time event streaming (Socket.IO or native ws).

- Quality Focus: Guarantee mathematically precise realized/unrealized P&L calculations accounting for contract point values, enforce strict multi-tenant isolation (broker_id), implement performance-indexed database schemas, and deliver resilient WebSocket event synchronization.

- Invoke: `backAgent.invoke(input)` returns `{ agent, content, meta? }`.

## Cybersecurity Analyst (`securityAgent.ts`)

- Role: Principal Security Architect & CFTC/NFA Compliance Engineer with deep expertise in B2B/B2C financial platforms, tenant isolation, OWASP threat modeling, and PII protection.

- Mission: Audit and harden all endpoints and WS handlers, implement PostgreSQL Row-Level Security (RLS) or Prisma extension guards, integrate automated PII log redaction, and author the comprehensive SECURITY.md writeup.

- Quality Focus: Active threat modeling to eliminate IDOR, log injection, JWT downgrade, and cross-tenant data leakage; writing senior-level code reviews for Task 4; and enforcing strict regulatory compliance (CFTC/NFA).

- Invoke: `securityAgent.invoke(input)` returns `{ agent, content, meta? }`.

## Configuration

- Set `LLM_API_KEY` to use a real model (see `LLM_MODEL`).
- Without it, agents return a stub response so the boilerplate runs offline.

## Adding an agent

1. Create `myAgent.ts` exporting an `Agent` (name + `invoke`).
2. Export it from `index.ts`.
3. Add it as a node in `AIarchitecture/graph.ts` (see that module's README).
