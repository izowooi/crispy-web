-- Archive and lobby index. Live state lives in each game's Durable Object; this table is
-- written on lifecycle changes (create, start, end) and every few moves.
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL,
  listed INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  status TEXT NOT NULL,
  result TEXT,
  reason TEXT,
  white TEXT NOT NULL,
  black TEXT NOT NULL,
  initial_ms INTEGER NOT NULL,
  increment_ms INTEGER NOT NULL,
  move_count INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  usage TEXT NOT NULL,
  creator_ip TEXT NOT NULL,
  expires_at INTEGER
);
CREATE INDEX IF NOT EXISTS games_status_created ON games (status, created_at DESC);
CREATE INDEX IF NOT EXISTS games_creator_status ON games (creator_ip, status);

-- AI games started per visitor (hashed IP) per KST day. ip = '*' holds the global total.
CREATE TABLE IF NOT EXISTS ai_quota (
  day TEXT NOT NULL,
  ip TEXT NOT NULL,
  games INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, ip)
);
