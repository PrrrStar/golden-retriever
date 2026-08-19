PRAGMA foreign_keys = ON;

CREATE TABLE subjects (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('concept', 'entity', 'event', 'story')),
  canonical_name TEXT NOT NULL,
  aliases_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);

CREATE TABLE traps (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  slug TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('dictionary', 'current_context', 'relation', 'timeline', 'structured_data')),
  experiment_source TEXT NOT NULL CHECK (experiment_source IN ('organic', 'calibration', 'self_eval')),
  published_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (slug, kind)
);

CREATE TABLE observations (
  id TEXT PRIMARY KEY,
  observed_at TEXT NOT NULL,
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  trap_id TEXT NOT NULL REFERENCES traps(id),
  trap_kind TEXT NOT NULL,
  experiment_source TEXT NOT NULL CHECK (experiment_source IN ('organic', 'calibration', 'self_eval')),
  actor_family TEXT NOT NULL,
  actor_mode TEXT NOT NULL CHECK (actor_mode IN ('training_crawler', 'search_indexer', 'user_fetcher', 'generic_search', 'human_browser', 'unknown_bot', 'unknown')),
  verification_level TEXT NOT NULL CHECK (verification_level IN ('cf_verified', 'provider_ip_verified', 'ua_only', 'unknown')),
  classifier_version TEXT NOT NULL,
  request_method TEXT NOT NULL CHECK (request_method IN ('GET', 'HEAD')),
  response_format TEXT NOT NULL CHECK (response_format IN ('html', 'json')),
  country TEXT,
  colo TEXT,
  referer_host TEXT,
  client_hash TEXT,
  evidence_json TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX observations_observed_at_idx ON observations(observed_at);
CREATE INDEX observations_subject_time_idx ON observations(subject_id, observed_at);
CREATE INDEX observations_actor_time_idx ON observations(actor_family, actor_mode, observed_at);
CREATE INDEX observations_trap_time_idx ON observations(trap_kind, observed_at);
CREATE INDEX observations_source_time_idx ON observations(experiment_source, observed_at);
