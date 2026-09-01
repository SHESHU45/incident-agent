# AI Incident / Troubleshooting Agent (Cloudflare)

An AI-powered agent that investigates production incidents end to end. A user
describes an incident in a chat UI; the agent plans an investigation with an LLM,
runs it as a durable Workflow, queries mock logs / metrics / deployment tools,
recalls similar past incidents via semantic search, persists everything, and
returns a root-cause analysis with evidence and a recommended action.

Built entirely on Cloudflare using the [Agents SDK](https://developers.cloudflare.com/agents/).

## Architecture

```
Chat UI (Cloudflare assets)
        |  HTTP
        v
IncidentAgent (Durable Object, Agents SDK)  --- state: incidents + progress
        |  runWorkflow()
        v
InvestigationWorkflow (Cloudflare Workflows, durable steps)
        |            |              |               |
        v            v              v               v
   Workers AI   Mock tools     Vectorize        D1
   (Llama 3.3)  logs/metrics/  (similar past    (incident
                deployments    incidents)        history)
```

Flow: incident submitted -> `IncidentAgent` stores it and starts the workflow ->
workflow runs durable steps (plan -> gather evidence -> recall similar -> analyze ->
persist) -> each step updates Agent state, which the UI polls for live progress ->
final RCA returned.

### Assignment requirement mapping

| Requirement            | Implementation                                             |
| ---------------------- | ---------------------------------------------------------- |
| LLM                    | Workers AI, `@cf/meta/llama-3.3-70b-instruct-fp8-fast`     |
| Workflow / coordination| Cloudflare Workflows (`AgentWorkflow`) + Durable Objects   |
| User input             | Chat UI served from Cloudflare static assets               |
| Memory / state         | Agent state (Durable Object) + D1 history + Vectorize recall|
| Deployment             | Cloudflare Workers                                          |
| Prompt history         | [`PROMPT_HISTORY.md`](./PROMPT_HISTORY.md)                  |

## Project structure

- `src/index.ts` — Worker entry: API routes + Agents routing + static assets.
- `src/agent.ts` — `IncidentAgent` Durable Object (state, starts workflow, RPC targets).
- `src/workflow.ts` — `InvestigationWorkflow` durable steps + progress reporting.
- `src/tools.ts` — mock logs / metrics / deployment diagnostic tools.
- `src/llm.ts` — Workers AI calls for plan generation and RCA synthesis.
- `src/vectorize.ts` — embed + upsert + query similar incidents.
- `src/db.ts` — D1 persistence helpers.
- `schema.sql` — D1 `incidents` table.
- `public/` — chat UI (`index.html`, `app.js`, `styles.css`).

## Prerequisites

- Node 18+ and a Cloudflare account.
- Wrangler: `npm i -g wrangler` (or use `npx wrangler`), then `wrangler login`.
- Workers AI, D1 and Vectorize enabled on the account (free tier is sufficient for a demo).

## Setup

```sh
npm install

# Create the D1 database, then copy the returned database_id into wrangler.jsonc
wrangler d1 create incident-db

# Create the Vectorize index (bge-base-en-v1.5 -> 768 dims, cosine)
wrangler vectorize create incidents-index --dimensions=768 --metric=cosine

# Apply the schema
npm run db:init          # remote
# or: npm run db:init:local
```

## Run locally

```sh
npm run dev
```

Open the printed local URL and submit an incident. Workers AI, D1 and Vectorize
run against remote resources during local dev.

## Deploy

```sh
npm run deploy
```

## Notes

- The diagnostic tools return deterministic mock data so the demo is reproducible
  and offline-friendly; swap them for real logging/metrics/deploy APIs in production.
- Vectorize recall improves as more incidents are investigated and stored.
