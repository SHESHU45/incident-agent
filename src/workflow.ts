import { AgentWorkflow } from "agents/workflows";
import type { AgentWorkflowEvent, AgentWorkflowStep } from "agents/workflows";
import type { IncidentAgent } from "./agent";
import type { Env, Evidence, InvestigationPlan, Rca, SimilarIncident } from "./types";
import { gatherEvidence } from "./tools";
import { generatePlan, synthesizeRca } from "./llm";
import { findSimilarIncidents, storeIncidentVector } from "./vectorize";
import { saveIncident } from "./db";

interface Params {
  incidentId: string;
  title: string;
  description: string;
}

export class InvestigationWorkflow extends AgentWorkflow<IncidentAgent, Params> {
  async run(event: AgentWorkflowEvent<Params>, step: AgentWorkflowStep) {
    const { incidentId, title, description } = event.payload;
    const env = this.env as Env;

    const plan = await step.do("plan", async (): Promise<InvestigationPlan> => {
      return generatePlan(env, title, description);
    });
    await this.agent.updateIncident(
      incidentId,
      { status: "gathering", plan },
      { incidentId, status: "planning", message: plan.summary, at: new Date().toISOString() }
    );
    await this.reportProgress({ step: "plan", status: "complete", message: "Investigation plan ready" });

    const evidence = await step.do("gather-evidence", async (): Promise<Evidence> => {
      return gatherEvidence(`${title} ${description}`);
    });
    await this.agent.updateIncident(
      incidentId,
      { status: "recalling", evidence },
      { incidentId, status: "gathering", message: "Collected logs, metrics and deployments", at: new Date().toISOString() }
    );
    await this.reportProgress({ step: "gather", status: "complete", message: "Evidence gathered" });

    const similar = await step.do("recall-similar", async (): Promise<SimilarIncident[]> => {
      try {
        return await findSimilarIncidents(env, `${title} ${description}`);
      } catch {
        return [];
      }
    });
    await this.agent.updateIncident(
      incidentId,
      { status: "analyzing", similar },
      { incidentId, status: "recalling", message: `Found ${similar.length} similar past incident(s)`, at: new Date().toISOString() }
    );
    await this.reportProgress({ step: "recall", status: "complete", message: "Recalled similar incidents" });

    const rca = await step.do("analyze", async (): Promise<Rca> => {
      return synthesizeRca(env, title, description, evidence, similar);
    });
    const resolvedAt = new Date().toISOString();
    await this.agent.updateIncident(
      incidentId,
      { status: "resolved", rca, resolvedAt },
      { incidentId, status: "resolved", message: rca.rootCause, at: resolvedAt }
    );

    await step.do("persist", async () => {
      await saveIncident(env, {
        id: incidentId,
        title,
        description,
        status: "resolved",
        plan,
        evidence,
        rca,
        createdAt: resolvedAt,
        resolvedAt,
      });
      try {
        await storeIncidentVector(env, incidentId, `${title} ${description}`, {
          title,
          rootCause: rca.rootCause,
        });
      } catch {
        // Vectorize may be unavailable in local dev; non-fatal.
      }
    });

    await this.reportProgress({ step: "analyze", status: "complete", message: "Root cause analysis complete" });
    await step.reportComplete(rca);
    return rca;
  }
}
