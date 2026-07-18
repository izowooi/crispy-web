CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  total INTEGER NOT NULL,
  bulk_mode TEXT NOT NULL,
  source_mode TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS prompts (
  id TEXT PRIMARY KEY,
  positive TEXT NOT NULL,
  positive_normalized TEXT NOT NULL,
  negative TEXT NOT NULL,
  negative_normalized TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS prompt_tags (
  prompt_id TEXT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  tag TEXT NOT NULL,
  PRIMARY KEY (prompt_id, position)
);

CREATE INDEX IF NOT EXISTS idx_prompt_tags_tag ON prompt_tags(tag);

CREATE TABLE IF NOT EXISTS generation_runs (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  prompt_id TEXT NOT NULL REFERENCES prompts(id),
  status TEXT NOT NULL,
  settings_json TEXT NOT NULL,
  seed INTEGER,
  error TEXT,
  created_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_runs_prompt ON generation_runs(prompt_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_campaign ON generation_runs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_runs_status ON generation_runs(status, created_at);

CREATE TABLE IF NOT EXISTS generation_images (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES generation_runs(id) ON DELETE CASCADE,
  image_index INTEGER NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  byte_size INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (run_id, image_index)
);

CREATE INDEX IF NOT EXISTS idx_images_run ON generation_images(run_id, image_index);
