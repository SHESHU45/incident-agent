import type { Evidence } from "./types";

/**
 * Mock diagnostic tools. In a real system these would call logging,
 * metrics and deployment APIs. Here they return deterministic fake data
 * derived from the incident text so demos are reproducible and offline.
 */

function hashText(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pick<T>(items: T[], seed: number): T {
  return items[seed % items.length];
}

export function getLogs(incident: string): string {
  const seed = hashText(incident);
  const now = new Date().toISOString();
  const service = incident.toLowerCase().includes("payment")
    ? "payment-service"
    : incident.toLowerCase().includes("auth")
      ? "auth-service"
      : "api-gateway";
  const error = pick(
    [
      "connection pool exhausted (max=20, active=20)",
      "upstream timeout after 30000ms calling downstream dependency",
      "NullPointerException in RequestHandler.process()",
      "circuit breaker OPEN for downstream 'ledger'",
      "OOMKilled: container exceeded memory limit 512Mi",
    ],
    seed
  );
  return [
    `${now} ERROR [${service}] 500 Internal Server Error - ${error}`,
    `${now} WARN  [${service}] p99 latency 4200ms (threshold 800ms)`,
    `${now} ERROR [${service}] 12 requests failed in last 60s`,
    `${now} INFO  [${service}] healthcheck degraded`,
  ].join("\n");
}

export function getMetrics(incident: string): string {
  const seed = hashText(incident) >> 3;
  const errorRate = 5 + (seed % 40);
  const cpu = 60 + (seed % 39);
  const mem = 70 + (seed % 29);
  const rps = 100 + (seed % 900);
  return [
    `error_rate: ${errorRate}% (baseline 0.5%)`,
    `cpu_utilization: ${cpu}%`,
    `memory_utilization: ${mem}%`,
    `requests_per_second: ${rps}`,
    `db_connection_wait_ms: ${100 + (seed % 2000)}`,
  ].join("\n");
}

export function getDeployments(incident: string): string {
  const seed = hashText(incident) >> 6;
  const minutesAgo = 5 + (seed % 120);
  const version = `v1.${20 + (seed % 30)}.${seed % 10}`;
  const change = pick(
    [
      "bumped connection pool config",
      "migrated ORM to new query builder",
      "added retry middleware",
      "upgraded runtime base image",
      "refactored request validation",
    ],
    seed
  );
  return [
    `Last deploy: ${version} (${minutesAgo} minutes ago)`,
    `Change summary: ${change}`,
    `Deployed by: ci-bot`,
    `Rollback available: yes`,
  ].join("\n");
}

export function gatherEvidence(incident: string): Evidence {
  return {
    logs: getLogs(incident),
    metrics: getMetrics(incident),
    deployments: getDeployments(incident),
  };
}
