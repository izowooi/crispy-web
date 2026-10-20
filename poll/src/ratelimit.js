export const WRITE_LIMIT_PER_MINUTE = 30;
export const CREATE_LIMIT_PER_DAY = 10;

const MINUTE = 60_000;
const DAY = 86_400_000;

// Windows are stored as their start time in ms so minute and day counters share one table.
async function hit(db, key, span, now) {
  const window = now - (now % span);
  const [, upsert] = await db.batch([
    db.prepare('DELETE FROM rate_limits WHERE window < ?').bind(now - 2 * DAY),
    db
      .prepare('INSERT INTO rate_limits (key, window, count) VALUES (?, ?, 1) ON CONFLICT (key, window) DO UPDATE SET count = count + 1 RETURNING count')
      .bind(key, window),
  ]);
  return upsert.results[0].count;
}

// Exact per-user cap on state changes, which the edge rate limiter can't guarantee.
export async function allowWrite(db, key, now) {
  return (await hit(db, key, MINUTE, now)) <= WRITE_LIMIT_PER_MINUTE;
}

// Anyone with a Google account can sign in, so cap how many questions one person can post a day.
// Checked before and counted after creation, so rejected (invalid) submissions don't use up the quota.
export async function canCreate(db, key, now) {
  const row = await db
    .prepare('SELECT count FROM rate_limits WHERE key = ? AND window = ?')
    .bind(`create:${key}`, now - (now % DAY))
    .first();
  return (row?.count ?? 0) < CREATE_LIMIT_PER_DAY;
}

export async function countCreate(db, key, now) {
  await hit(db, `create:${key}`, DAY, now);
}
