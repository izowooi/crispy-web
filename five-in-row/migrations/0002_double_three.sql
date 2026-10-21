-- Who may not play a double-three (쌍삼): 'black' (default), 'both' or 'none'.
ALTER TABLE games ADD COLUMN double_three TEXT NOT NULL DEFAULT 'black';
