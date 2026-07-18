ALTER TABLE prompts ADD COLUMN positive_hash TEXT;
ALTER TABLE prompts ADD COLUMN negative_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_prompts_positive_hash ON prompts(positive_hash);
CREATE INDEX IF NOT EXISTS idx_prompts_negative_hash ON prompts(negative_hash);
