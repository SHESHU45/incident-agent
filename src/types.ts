export interface Env {
  AI: Ai;
  DB: D1Database;
  VECTORIZE: VectorizeIndex;
  IncidentAgent: DurableObjectNamespace<import("./agent").IncidentAgent>;
  INVESTIGATION_WORKFLOW: Workflow;
  ASSETS: Fetcher;
}

export type IncidentStatus =
  | "queued"
  | "planning"
  | "gathering"
  | "recalling"
  | "analyzing"
  | "resolved"
  | "error";

export interface ProgressEvent {
  incidentId: string;
  status: IncidentStatus;
  message: string;
  at: string;
}

export interface InvestigationPlan {
  summary: string;
  steps: string[];
  suspectedAreas: string[];
}

export interface Evidence {
  logs: string;
  metrics: string;
  deployments: string;
}

export interface SimilarIncident {
  id: string;
  title: string;
  rootCause: string;
  score: number;
}

export interface Rca {
  rootCause: string;
  evidence: string;
  recommendedAction: string;
  confidence: number;
}

export interface IncidentRecord {
  id: string;
  title: string;
  description: string;
  status: IncidentStatus;
  plan: InvestigationPlan | null;
  evidence: Evidence | null;
  similar: SimilarIncident[];
  rca: Rca | null;
  progress: ProgressEvent[];
  createdAt: string;
  resolvedAt: string | null;
}

export interface AgentState {
  incidents: Record<string, IncidentRecord>;
}
