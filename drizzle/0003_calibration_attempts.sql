CREATE TABLE calibration_attempts (
  id TEXT PRIMARY KEY,
  attempted_at TEXT NOT NULL,
  actor_family TEXT NOT NULL,
  product TEXT NOT NULL,
  trap_id TEXT NOT NULL REFERENCES traps(id),
  prompt_class TEXT NOT NULL CHECK (prompt_class IN ('direct_url', 'natural_question')),
  expected_mode TEXT NOT NULL CHECK (expected_mode IN ('user_fetcher', 'search_indexer'))
);

CREATE INDEX calibration_attempts_time_idx ON calibration_attempts(attempted_at);
CREATE INDEX calibration_attempts_match_idx ON calibration_attempts(trap_id, actor_family, attempted_at);
