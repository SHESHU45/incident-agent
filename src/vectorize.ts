import type { Env, SimilarIncident } from "./types";

const EMBEDDING_MODEL = "@cf/baai/bge-base-en-v1.5";

async function embed(env: Env, text: string): Promise<number[]> {
  const result = (await env.AI.run(EMBEDDING_MODEL, { text: [text] })) as {
    data: number[][];
  };
  return result.data[0];
}

/** Query the index for incidents similar to the given text. */
export async function findSimilarIncidents(
  env: Env,
  text: string,
  topK = 3
): Promise<SimilarIncident[]> {
  const vector = await embed(env, text);
  const matches = await env.VECTORIZE.query(vector, {
    topK,
    returnMetadata: "all",
  });
  return matches.matches.map((m) => {
    const meta = (m.metadata ?? {}) as Record<string, string>;
    return {
      id: m.id,
      title: meta.title ?? "unknown",
      rootCause: meta.rootCause ?? "unknown",
      score: m.score,
    };
  });
}

/** Store a resolved incident so future investigations can recall it. */
export async function storeIncidentVector(
  env: Env,
  id: string,
  text: string,
  metadata: { title: string; rootCause: string }
): Promise<void> {
  const vector = await embed(env, text);
  await env.VECTORIZE.upsert([
    {
      id,
      values: vector,
      metadata,
    },
  ]);
}
