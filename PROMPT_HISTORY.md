# Prompt History

This project was built with AI-assisted coding (Cursor). Below is the prompt
history that drove the design and implementation, as required by the assignment.

## 1. Project selection / architecture

> Prompt: The Cloudflare assignment asks for an AI-powered app with an LLM,
> workflow/coordination, user input via chat, and memory/state. Rather than the
> generic "lunch agent" demo, propose a project that showcases software
> engineering + AI + platform experience, and map it to Cloudflare components.

Outcome: Chose an **AI Incident / Troubleshooting Agent** — a user submits a
production incident; the agent plans an investigation, queries system tools,
recalls similar incidents, and produces a root-cause analysis. Mapped to:
Workers AI (Llama 3.3), Workflows + Durable Objects, chat UI, and
Durable Object state + D1 + Vectorize.

## 2. Plan

> Prompt: Read the shared Cloudflare Agents docs and produce a concrete plan:
> project architecture, folder structure, Cloudflare services, and build steps.

Outcome: A plan defining the Agent -> Workflow -> Tools/LLM/State data flow and
the file layout (`agent.ts`, `workflow.ts`, `tools.ts`, `llm.ts`, `vectorize.ts`,
`db.ts`, `index.ts`, `public/`).

## 3. Decisions

> Prompt: Confirm key decisions — LLM = Workers AI Llama 3.3 (no API key),
> tools/data = mock logs/metrics/deploys + D1 history + Vectorize semantic recall,
> include Wrangler setup since not logged in.

## 4. Implementation

> Prompt: Implement the plan. Scaffold the project, configure `wrangler.jsonc`
> bindings (AI, Durable Object, Workflow, D1, Vectorize, assets, migrations),
> implement the mock tools, the LLM plan/RCA calls, Vectorize recall, D1
> persistence, the `IncidentAgent` and `InvestigationWorkflow`, and a chat UI.

Key API references used (Cloudflare docs):
- `AgentWorkflow` from `agents/workflows`, `this.agent` RPC, `reportProgress`,
  `step.do(...)`, `step.reportComplete(...)`.
- `Agent.runWorkflow(bindingName, params)` and `onWorkflowProgress` callback.
- `getAgentByName` / `routeAgentRequest` from `agents`.
- Workers AI models `@cf/meta/llama-3.3-70b-instruct-fp8-fast` and
  `@cf/baai/bge-base-en-v1.5` (768-dim embeddings).

## 5. Verification

> Prompt: Install dependencies, typecheck, run locally, then deploy and
> smoke-test the public URL.

<!-- Append further prompts here as the project evolves. -->
