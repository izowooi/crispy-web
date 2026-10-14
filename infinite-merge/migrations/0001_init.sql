-- Infinite Merge schema (Cloudflare D1 / SQLite). Every table is prefixed with im_.
-- Apply: npm run db:migrate:local  |  npm run db:migrate:remote

-- Every element that exists in the shared world. The five base elements are seeded below.
CREATE TABLE im_elements (
  name TEXT PRIMARY KEY,
  emoji TEXT NOT NULL,
  desc TEXT,
  created_at INTEGER NOT NULL,
  first_by_sub TEXT
);

-- Shared recipe book: once anyone discovers a pair, everyone gets it without a model call.
CREATE TABLE im_recipes (
  pair_key TEXT PRIMARY KEY,
  a TEXT NOT NULL,
  b TEXT NOT NULL,
  result_name TEXT NOT NULL REFERENCES im_elements(name),
  model TEXT,
  created_at INTEGER NOT NULL,
  created_by_sub TEXT
);

-- What each player (ChatGPT account or guest) owns.
CREATE TABLE im_discoveries (
  sub TEXT NOT NULL,
  element_name TEXT NOT NULL REFERENCES im_elements(name),
  discovered_at INTEGER NOT NULL,
  first_discovery INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (sub, element_name)
);

CREATE TABLE im_accounts (
  sub TEXT PRIMARY KEY,
  email TEXT,
  name TEXT,
  picture TEXT,
  client_id TEXT,
  selected_model TEXT,
  created_at INTEGER NOT NULL,
  last_login_at INTEGER NOT NULL
);

CREATE TABLE im_sessions (
  id TEXT PRIMARY KEY,
  sub TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX im_sessions_sub ON im_sessions (sub);
CREATE INDEX im_sessions_expires_at ON im_sessions (expires_at);

-- Sign in with ChatGPT state/nonce/PKCE between /auth/chatgpt and /auth/callback (local runs only).
CREATE TABLE im_oauth_pending (
  state TEXT PRIMARY KEY,
  nonce TEXT NOT NULL,
  verifier TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  client_id TEXT NOT NULL,
  account_sub TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX im_oauth_pending_created_at ON im_oauth_pending (created_at);

-- Operator-paid usage per KST day. scope: '*' (all guests), 'guest:…' (one guest),
-- 'ip:<hash>' (model calls from one IP), 'join:<hash>' (guest sessions started from one IP).
CREATE TABLE im_guest_usage (
  day TEXT NOT NULL,
  scope TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, scope)
);

-- Cheap world size for every page load: COUNT(*) would read every element row each time.
CREATE TABLE im_counters (
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);
INSERT INTO im_counters (key, value) VALUES ('elements', 0);

CREATE TRIGGER im_elements_count_insert AFTER INSERT ON im_elements
BEGIN
  UPDATE im_counters SET value = value + 1 WHERE key = 'elements';
END;

CREATE TRIGGER im_elements_count_delete AFTER DELETE ON im_elements
BEGIN
  UPDATE im_counters SET value = value - 1 WHERE key = 'elements';
END;

-- Keep in sync with BASE_ELEMENTS in lib/elements.ts (a test checks this).
INSERT INTO im_elements (name, emoji, desc, created_at, first_by_sub) VALUES
  ('나무', '🌳', '뻗어 오르는 생명의 기운', 0, NULL),
  ('불', '🔥', '타오르며 위로 솟는 기운', 0, NULL),
  ('흙', '⛰️', '모든 것을 품고 길러내는 기운', 0, NULL),
  ('금속', '⚙️', '단단히 맺히고 갈무리하는 기운', 0, NULL),
  ('물', '💧', '낮은 곳으로 스며 흐르는 기운', 0, NULL);
