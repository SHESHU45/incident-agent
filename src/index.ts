import { getAgentByName, routeAgentRequest } from "agents";
import { AGENT_NAME, IncidentAgent } from "./agent";
import { InvestigationWorkflow } from "./workflow";
import { listIncidents } from "./db";
import type { Env } from "./types";

export { IncidentAgent, InvestigationWorkflow };

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      const agent = await getAgentByName<Env, IncidentAgent>(
        env.IncidentAgent,
        AGENT_NAME
      );

      if (url.pathname === "/api/investigate" && request.method === "POST") {
        const body = (await request.json().catch(() => ({}))) as {
          title?: string;
          description?: string;
        };
        const description = (body.description ?? "").trim();
        if (!description) return json({ error: "description is required" }, 400);
        const title = (body.title ?? description.slice(0, 60)).trim();
        const result = await agent.startInvestigation(title, description);
        return json(result, 202);
      }

      if (url.pathname === "/api/incidents" && request.method === "GET") {
        return json({ incidents: await agent.getIncidents() });
      }

      if (url.pathname === "/api/incident" && request.method === "GET") {
        const id = url.searchParams.get("id");
        if (!id) return json({ error: "id is required" }, 400);
        const incident = await agent.getIncident(id);
        if (!incident) return json({ error: "not found" }, 404);
        return json({ incident });
      }

      if (url.pathname === "/api/history" && request.method === "GET") {
        return json({ incidents: await listIncidents(env) });
      }

      return json({ error: "not found" }, 404);
    }

    // Agents SDK routing (WebSocket state sync, if a client uses it).
    const agentResponse = await routeAgentRequest(request, env);
    if (agentResponse) return agentResponse;

    // Fall through to static assets (configured via the `assets` binding).
    return env.ASSETS ? env.ASSETS.fetch(request) : new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
