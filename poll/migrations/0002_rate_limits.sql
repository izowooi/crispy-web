-- Per-user write counter (fixed 1-minute windows). key is an HMAC, never an email.
CREATE TABLE rate_limits (
  key TEXT NOT NULL,
  window INTEGER NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (key, window)
);
