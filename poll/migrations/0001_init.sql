-- No email is ever stored. Identities are per-poll HMACs (see src/crypto.js).
CREATE TABLE polls (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  multi INTEGER NOT NULL DEFAULT 0 CHECK (multi IN (0, 1)),
  results_mode TEXT NOT NULL DEFAULT 'live' CHECK (results_mode IN ('live', 'after_close')),
  closes_at INTEGER NOT NULL, -- UTC epoch ms
  created_at INTEGER NOT NULL, -- UTC epoch ms
  creator_hash TEXT NOT NULL
);
CREATE INDEX polls_closes_created ON polls (closes_at, created_at);
CREATE INDEX polls_created ON polls (created_at);

CREATE TABLE options (
  id TEXT PRIMARY KEY,
  poll_id TEXT NOT NULL REFERENCES polls (id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  position INTEGER NOT NULL
);
CREATE INDEX options_poll ON options (poll_id, position);

CREATE TABLE ballots (
  poll_id TEXT NOT NULL REFERENCES polls (id) ON DELETE CASCADE,
  voter_hash TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (poll_id, voter_hash)
);

CREATE TABLE ballot_choices (
  poll_id TEXT NOT NULL,
  voter_hash TEXT NOT NULL,
  option_id TEXT NOT NULL REFERENCES options (id) ON DELETE CASCADE,
  PRIMARY KEY (poll_id, voter_hash, option_id),
  FOREIGN KEY (poll_id, voter_hash) REFERENCES ballots (poll_id, voter_hash) ON DELETE CASCADE
);
CREATE INDEX ballot_choices_option ON ballot_choices (poll_id, option_id);
