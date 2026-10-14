-- Rebuild the three big tables as WITHOUT ROWID. A rowid table with a TEXT primary key keeps the row
-- and a separate primary-key index, so D1 bills every insert as 2 rows written (measured on remote:
-- 3 inserts → 6 vs 3). Free allows 100k rows written per day, so this halves the cost of seeding
-- recipes and of every discovery. Columns, keys and counter triggers stay the same.

-- The foreign keys from im_recipes/im_discoveries to im_elements are dropped. With them, D1 cannot rebuild
-- im_elements: foreign_keys stays on, and DROP TABLE counts every child row as a deferred violation that
-- the renamed copy never clears. combine.ts always writes the element before rows that point to it.
-- Children are rebuilt first so that nothing references the old im_elements when it is dropped.

CREATE TABLE im_recipes_new (
  pair_key TEXT PRIMARY KEY,
  a TEXT NOT NULL,
  b TEXT NOT NULL,
  result_name TEXT NOT NULL,
  model TEXT,
  created_at INTEGER NOT NULL,
  created_by_sub TEXT
) WITHOUT ROWID;
INSERT INTO im_recipes_new SELECT pair_key, a, b, result_name, model, created_at, created_by_sub FROM im_recipes;
DROP TABLE im_recipes;
ALTER TABLE im_recipes_new RENAME TO im_recipes;

CREATE TABLE im_discoveries_new (
  sub TEXT NOT NULL,
  element_name TEXT NOT NULL,
  discovered_at INTEGER NOT NULL,
  first_discovery INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (sub, element_name)
) WITHOUT ROWID;
INSERT INTO im_discoveries_new SELECT sub, element_name, discovered_at, first_discovery FROM im_discoveries;
DROP TABLE im_discoveries;
ALTER TABLE im_discoveries_new RENAME TO im_discoveries;

CREATE TABLE im_elements_new (
  name TEXT PRIMARY KEY,
  emoji TEXT NOT NULL,
  desc TEXT,
  created_at INTEGER NOT NULL,
  first_by_sub TEXT
) WITHOUT ROWID;
INSERT INTO im_elements_new SELECT name, emoji, desc, created_at, first_by_sub FROM im_elements;
DROP TABLE im_elements;
ALTER TABLE im_elements_new RENAME TO im_elements;

-- Triggers belong to the dropped table, so recreate them exactly as in 0002_seed_claim.sql.
CREATE TRIGGER im_elements_count_insert AFTER INSERT ON im_elements
WHEN NEW.first_by_sub IS NOT 'seed'
BEGIN
  UPDATE im_counters SET value = value + 1 WHERE key = 'elements';
END;

CREATE TRIGGER im_elements_count_claim AFTER UPDATE OF first_by_sub ON im_elements
WHEN OLD.first_by_sub IS 'seed' AND NEW.first_by_sub IS NOT 'seed'
BEGIN
  UPDATE im_counters SET value = value + 1 WHERE key = 'elements';
END;

CREATE TRIGGER im_elements_count_delete AFTER DELETE ON im_elements
WHEN OLD.first_by_sub IS NOT 'seed'
BEGIN
  UPDATE im_counters SET value = value - 1 WHERE key = 'elements';
END;
