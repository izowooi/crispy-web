CREATE TABLE IF NOT EXISTS ledger (
 id TEXT PRIMARY KEY,
 browser TEXT NOT NULL,
 day TEXT NOT NULL,
 month TEXT NOT NULL,
 flare REAL NOT NULL DEFAULT 0,
 sunburst REAL NOT NULL DEFAULT 0,
 banana REAL NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ledger_browser_day ON ledger(browser,day);
CREATE INDEX IF NOT EXISTS ledger_month ON ledger(month);
