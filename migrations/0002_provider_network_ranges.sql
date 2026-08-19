CREATE TABLE provider_network_ranges (
  actor_family TEXT NOT NULL,
  actor_mode TEXT NOT NULL,
  prefix TEXT NOT NULL,
  source_url TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  PRIMARY KEY (actor_family, actor_mode, prefix)
);

CREATE INDEX provider_network_ranges_lookup_idx
  ON provider_network_ranges(actor_family, actor_mode);
