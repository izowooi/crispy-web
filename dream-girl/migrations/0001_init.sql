-- MUSE CUP : Ideal World Cup (dream-girl) D1 Schema & Seed
-- Tables: dg_character_stats, dg_tournaments, dg_shares

CREATE TABLE IF NOT EXISTS dg_character_stats (
  character_id TEXT PRIMARY KEY,
  theme TEXT NOT NULL,
  wins INTEGER NOT NULL DEFAULT 0,
  matches INTEGER NOT NULL DEFAULT 0,
  championships INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS dg_tournaments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  winner_id TEXT NOT NULL,
  runner_up_id TEXT,
  semifinalist_ids TEXT,
  theme TEXT NOT NULL,
  round_size INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS dg_shares (
  id TEXT PRIMARY KEY,
  winner_id TEXT NOT NULL,
  runner_up_id TEXT,
  semifinalist_ids TEXT,
  theme TEXT NOT NULL,
  round_size INTEGER NOT NULL,
  history_json TEXT NOT NULL,
  nickname TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_dg_tournaments_created_at ON dg_tournaments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dg_stats_championships ON dg_character_stats(championships DESC, wins DESC);

-- Seed 64 characters with initial stats so the global leaderboard is rich from day one
INSERT OR IGNORE INTO dg_character_stats (character_id, theme, wins, matches, championships) VALUES
  ('f01', 'fantasy', 48, 56, 7),
  ('f02', 'fantasy', 52, 60, 8),
  ('f03', 'fantasy', 44, 54, 5),
  ('f04', 'fantasy', 38, 49, 4),
  ('f05', 'fantasy', 46, 55, 6),
  ('f06', 'fantasy', 39, 50, 4),
  ('f07', 'fantasy', 49, 58, 7),
  ('f08', 'fantasy', 31, 44, 2),
  ('f09', 'fantasy', 34, 46, 3),
  ('f10', 'fantasy', 35, 47, 3),
  ('f11', 'fantasy', 45, 55, 6),
  ('f12', 'fantasy', 36, 48, 3),
  ('f13', 'fantasy', 40, 51, 4),
  ('f14', 'fantasy', 33, 45, 3),
  ('f15', 'fantasy', 42, 52, 5),
  ('f16', 'fantasy', 41, 51, 5),
  ('m01', 'modern', 50, 58, 7),
  ('m02', 'modern', 54, 62, 9),
  ('m03', 'modern', 45, 55, 6),
  ('m04', 'modern', 38, 49, 4),
  ('m05', 'modern', 43, 53, 5),
  ('m06', 'modern', 37, 48, 3),
  ('m07', 'modern', 39, 50, 4),
  ('m08', 'modern', 41, 52, 4),
  ('m09', 'modern', 35, 47, 3),
  ('m10', 'modern', 42, 53, 5),
  ('m11', 'modern', 36, 48, 3),
  ('m12', 'modern', 40, 51, 4),
  ('m13', 'modern', 44, 54, 5),
  ('m14', 'modern', 37, 49, 3),
  ('m15', 'modern', 46, 56, 6),
  ('m16', 'modern', 42, 52, 5),
  ('mf01', 'male_fantasy', 58, 65, 10),
  ('mf02', 'male_fantasy', 53, 61, 8),
  ('mf03', 'male_fantasy', 49, 58, 7),
  ('mf04', 'male_fantasy', 41, 52, 4),
  ('mf05', 'male_fantasy', 51, 59, 8),
  ('mf06', 'male_fantasy', 43, 53, 5),
  ('mf07', 'male_fantasy', 44, 54, 5),
  ('mf08', 'male_fantasy', 38, 49, 3),
  ('mf09', 'male_fantasy', 40, 51, 4),
  ('mf10', 'male_fantasy', 36, 48, 3),
  ('mf11', 'male_fantasy', 45, 55, 6),
  ('mf12', 'male_fantasy', 42, 53, 5),
  ('mf13', 'male_fantasy', 48, 57, 7),
  ('mf14', 'male_fantasy', 37, 48, 3),
  ('mf15', 'male_fantasy', 50, 59, 7),
  ('mf16', 'male_fantasy', 52, 60, 8),
  ('mm01', 'male_modern', 56, 64, 9),
  ('mm02', 'male_modern', 51, 60, 8),
  ('mm03', 'male_modern', 48, 57, 7),
  ('mm04', 'male_modern', 41, 52, 4),
  ('mm05', 'male_modern', 49, 58, 7),
  ('mm06', 'male_modern', 45, 55, 6),
  ('mm07', 'male_modern', 44, 54, 5),
  ('mm08', 'male_modern', 39, 50, 4),
  ('mm09', 'male_modern', 42, 52, 5),
  ('mm10', 'male_modern', 46, 56, 6),
  ('mm11', 'male_modern', 38, 49, 3),
  ('mm12', 'male_modern', 47, 56, 6),
  ('mm13', 'male_modern', 43, 53, 5),
  ('mm14', 'male_modern', 40, 51, 4),
  ('mm15', 'male_modern', 42, 52, 5),
  ('mm16', 'male_modern', 45, 55, 6);
