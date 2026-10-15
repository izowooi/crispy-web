-- Per-guest refill (lib/server/guest/quota.ts): the time the guest bucket last got calls back.
-- NULL on rows written before this migration, which counts as "now" (no retroactive refill).
ALTER TABLE im_guest_usage ADD COLUMN refilled_at INTEGER;
