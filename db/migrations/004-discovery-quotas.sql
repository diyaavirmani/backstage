CREATE TABLE IF NOT EXISTS discovery_quota_counters (
  period TEXT NOT NULL,
  scope TEXT NOT NULL CHECK(scope IN ('global','session')),
  subject_hash TEXT NOT NULL,
  request_count INTEGER NOT NULL CHECK(request_count >= 0),
  updated_at TEXT NOT NULL,
  PRIMARY KEY(period, scope, subject_hash)
);
CREATE INDEX IF NOT EXISTS discovery_quota_period_idx ON discovery_quota_counters(period);
