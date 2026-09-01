import type { Env, Evidence, IncidentRecord, InvestigationPlan, Rca } from "./types";

/** Persist a fully investigated incident to D1. */
export async function saveIncident(
  env: Env,
  record: {
    id: string;
    title: string;
    description: string;
    status: string;
    plan: InvestigationPlan | null;
    evidence: Evidence | null;
    rca: Rca | null;
    createdAt: string;
    resolvedAt: string | null;
  }
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO incidents
      (id, title, description, status, plan, evidence, root_cause, recommended_action, confidence, created_at, resolved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       status = excluded.status,
       plan = excluded.plan,
       evidence = excluded.evidence,
       root_cause = excluded.root_cause,
       recommended_action = excluded.recommended_action,
       confidence = excluded.confidence,
       resolved_at = excluded.resolved_at`
  )
    .bind(
      record.id,
      record.title,
      record.description,
      record.status,
      record.plan ? JSON.stringify(record.plan) : null,
      record.evidence ? JSON.stringify(record.evidence) : null,
      record.rca?.rootCause ?? null,
      record.rca?.recommendedAction ?? null,
      record.rca?.confidence ?? null,
      record.createdAt,
      record.resolvedAt
    )
    .run();
}

export async function listIncidents(env: Env, limit = 20): Promise<IncidentRecord[]> {
  const { results } = await env.DB.prepare(
    `SELECT * FROM incidents ORDER BY created_at DESC LIMIT ?`
  )
    .bind(limit)
    .all();
  return (results ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: String(r.id),
      title: String(r.title),
      description: String(r.description),
      status: r.status as IncidentRecord["status"],
      plan: r.plan ? (JSON.parse(String(r.plan)) as InvestigationPlan) : null,
      evidence: r.evidence ? (JSON.parse(String(r.evidence)) as Evidence) : null,
      similar: [],
      rca:
        r.root_cause != null
          ? {
              rootCause: String(r.root_cause),
              evidence: "",
              recommendedAction: String(r.recommended_action ?? ""),
              confidence: Number(r.confidence ?? 0),
            }
          : null,
      progress: [],
      createdAt: String(r.created_at),
      resolvedAt: r.resolved_at ? String(r.resolved_at) : null,
    };
  });
}
