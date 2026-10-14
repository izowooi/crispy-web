-- Pre-seeded recipes (scripts/seed-recipes.mjs) create elements with first_by_sub = 'seed'.
-- They sit in the shared recipe book unclaimed: the first player to make one claims the
-- "world first" (combine.ts), and only then does it count toward the world size shown in the UI.

DROP TRIGGER im_elements_count_insert;
DROP TRIGGER im_elements_count_delete;

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
