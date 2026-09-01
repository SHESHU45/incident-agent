import type { Env, Evidence, InvestigationPlan, Rca, SimilarIncident } from "./types";

const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

async function runLlm(env: Env, system: string, user: string): Promise<string> {
  const result = (await env.AI.run(MODEL, {
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    max_tokens: 1024,
    temperature: 0.2,
  })) as { response?: string };
  return result.response ?? "";
}

/** Extract the first JSON object/array from a model response. */
function extractJson<T>(text: string, fallback: T): T {
  const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) return fallback;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return fallback;
  }
}

export async function generatePlan(
  env: Env,
  title: string,
  description: string
): Promise<InvestigationPlan> {
  const system =
    "You are a senior SRE. Given an incident, produce a concise investigation plan. " +
    "Respond ONLY with JSON matching: " +
    '{"summary": string, "steps": string[], "suspectedAreas": string[]}.';
  const user = `Incident title: ${title}\nDescription: ${description}`;
  const raw = await runLlm(env, system, user);
  return extractJson<InvestigationPlan>(raw, {
    summary: `Investigate: ${title}`,
    steps: ["Review recent logs", "Check metrics", "Inspect recent deployments"],
    suspectedAreas: ["recent deployment", "resource exhaustion"],
  });
}

export async function synthesizeRca(
  env: Env,
  title: string,
  description: string,
  evidence: Evidence,
  similar: SimilarIncident[]
): Promise<Rca> {
  const system =
    "You are a senior SRE performing root cause analysis. Use the provided evidence and " +
    "similar past incidents. Respond ONLY with JSON matching: " +
    '{"rootCause": string, "evidence": string, "recommendedAction": string, "confidence": number} ' +
    "where confidence is between 0 and 1.";
  const similarText =
    similar.length > 0
      ? similar
          .map((s) => `- ${s.title} (root cause: ${s.rootCause}, similarity ${s.score.toFixed(2)})`)
          .join("\n")
      : "None found.";
  const user = [
    `Incident: ${title}`,
    `Description: ${description}`,
    "",
    "LOGS:",
    evidence.logs,
    "",
    "METRICS:",
    evidence.metrics,
    "",
    "DEPLOYMENTS:",
    evidence.deployments,
    "",
    "SIMILAR PAST INCIDENTS:",
    similarText,
  ].join("\n");
  const raw = await runLlm(env, system, user);
  return extractJson<Rca>(raw, {
    rootCause: "Undetermined from available evidence.",
    evidence: "See logs, metrics and deployment history.",
    recommendedAction: "Escalate to on-call engineer for manual review.",
    confidence: 0.3,
  });
}
