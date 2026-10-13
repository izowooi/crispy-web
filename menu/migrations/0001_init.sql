CREATE TABLE daycares (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  pin_salt TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE menus (
  daycare_id TEXT NOT NULL REFERENCES daycares(id) ON DELETE CASCADE,
  ym TEXT NOT NULL,
  data TEXT NOT NULL,
  image_key TEXT,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (daycare_id, ym)
);

CREATE TABLE usage_events (
  kind TEXT NOT NULL,
  scope TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX usage_events_lookup ON usage_events (kind, scope, created_at);
