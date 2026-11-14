CREATE TABLE users (
  id          TEXT PRIMARY KEY,
  google_sub  TEXT NOT NULL UNIQUE,
  email       TEXT NOT NULL,
  name        TEXT NOT NULL DEFAULT '',
  picture     TEXT NOT NULL DEFAULT '',
  created_at  INTEGER NOT NULL
);

-- 토큰 원문은 저장하지 않는다. token_hash = SHA-256(token) hex.
CREATE TABLE sessions (
  token_hash    TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL CHECK (kind IN ('web', 'device')),
  label         TEXT NOT NULL DEFAULT '',
  created_at    INTEGER NOT NULL,
  last_used_at  INTEGER NOT NULL,
  expires_at    INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE INDEX sessions_expiry ON sessions(expires_at);

-- 앱 연결용 1회성 코드 (PKCE challenge에 묶인다)
CREATE TABLE auth_codes (
  code_hash   TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge   TEXT NOT NULL,
  label       TEXT NOT NULL DEFAULT '',
  expires_at  INTEGER NOT NULL
);

CREATE TABLE bookmarks (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url          TEXT,
  title        TEXT NOT NULL DEFAULT '',
  note         TEXT NOT NULL DEFAULT '',
  description  TEXT NOT NULL DEFAULT '',
  image        TEXT,
  site_name    TEXT NOT NULL DEFAULT '',
  favicon      TEXT,
  created_at   INTEGER NOT NULL,
  read_at      INTEGER,
  deleted_at   INTEGER,
  meta_at      INTEGER
);
CREATE INDEX bookmarks_list ON bookmarks(user_id, created_at DESC, id DESC) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX bookmarks_url ON bookmarks(user_id, url) WHERE url IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX bookmarks_trash ON bookmarks(deleted_at) WHERE deleted_at IS NOT NULL;
