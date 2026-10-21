/** Calendar day in Korea (UTC+9), used to reset daily AI quotas at local midnight. */
export function kstDay(now = Date.now()): string {
  return new Date(now + 9 * 3600_000).toISOString().slice(0, 10);
}
