/** Inclusive index range of feed items to keep mounted around `current`. */
export function getFeedWindow(current: number, length: number, radius: number): { start: number; end: number } {
  if (length <= 0) return { start: 0, end: -1 };
  const clamped = Math.min(Math.max(current, 0), length - 1);
  return { start: Math.max(0, clamped - radius), end: Math.min(length - 1, clamped + radius) };
}

/**
 * Only the visible clip buffers aggressively; the next one fetches just enough
 * to start instantly, the rest only show their poster. Keeps a home uplink from
 * serving several large files at once.
 */
export function preloadFor(distance: number): 'auto' | 'metadata' | 'none' {
  if (distance === 0) return 'auto';
  if (distance === 1) return 'metadata';
  return 'none';
}
