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
