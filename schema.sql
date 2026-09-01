-- Incident history persisted by the investigation workflow.
CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  plan TEXT,
  evidence TEXT,
  root_cause TEXT,
  recommended_action TEXT,
  confidence REAL,
  created_at TEXT NOT NULL,
  resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents (created_at DESC);
