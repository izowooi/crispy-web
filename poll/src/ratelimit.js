export const WRITE_LIMIT_PER_MINUTE = 30;

// Exact per-user cap on state changes, which the edge rate limiter can't guarantee.
export async function allowWrite(db, key, now) {
  const window = Math.floor(now / 60_000);
  const [, upsert] = await db.batch([
    db.prepare('DELETE FROM rate_limits WHERE window < ?').bind(window - 1),
    db
      .prepare('INSERT INTO rate_limits (key, window, count) VALUES (?, ?, 1) ON CONFLICT (key, window) DO UPDATE SET count = count + 1 RETURNING count')
      .bind(key, window),
  ]);
  return upsert.results[0].count <= WRITE_LIMIT_PER_MINUTE;
}
