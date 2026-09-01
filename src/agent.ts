import { Agent } from "agents";
import type {
  AgentState,
  Env,
  IncidentRecord,
  ProgressEvent,
} from "./types";

const AGENT_NAME = "global";

export { AGENT_NAME };

export class IncidentAgent extends Agent<Env, AgentState> {
  initialState: AgentState = { incidents: {} };

  /** Entry point: create an incident and kick off the durable investigation. */
  async startInvestigation(title: string, description: string): Promise<{ incidentId: string }> {
    const incidentId = crypto.randomUUID();
    const now = new Date().toISOString();
    const record: IncidentRecord = {
      id: incidentId,
      title,
      description,
      status: "queued",
      plan: null,
      evidence: null,
      similar: [],
      rca: null,
      progress: [
        { incidentId, status: "queued", message: "Incident received", at: now },
      ],
      createdAt: now,
      resolvedAt: null,
    };
    this.setState({
      incidents: { ...this.state.incidents, [incidentId]: record },
    });

    await this.runWorkflow("INVESTIGATION_WORKFLOW", {
      incidentId,
      title,
      description,
    });

    return { incidentId };
  }

  /** RPC target used by the workflow to merge partial updates into an incident. */
  async updateIncident(
    incidentId: string,
    patch: Partial<IncidentRecord>,
    progress?: ProgressEvent
  ): Promise<void> {
    const existing = this.state.incidents[incidentId];
    if (!existing) return;
    const updated: IncidentRecord = {
      ...existing,
      ...patch,
      progress: progress ? [...existing.progress, progress] : existing.progress,
    };
    this.setState({
      incidents: { ...this.state.incidents, [incidentId]: updated },
    });
  }

  getIncident(incidentId: string): IncidentRecord | null {
    return this.state.incidents[incidentId] ?? null;
  }

  getIncidents(): IncidentRecord[] {
    return Object.values(this.state.incidents).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
  }

  async onWorkflowProgress(
    _workflowName: string,
    _instanceId: string,
    progress: unknown
  ): Promise<void> {
    this.broadcast(JSON.stringify({ type: "progress", progress }));
  }

  async onWorkflowError(
    _workflowName: string,
    _instanceId: string,
    error: string
  ): Promise<void> {
    this.broadcast(JSON.stringify({ type: "error", error }));
  }
}
