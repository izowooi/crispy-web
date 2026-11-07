import path from 'node:path';

// Only these two folders are ever served or written. metadata.json lives in the
// same DATA_DIR but must never be reachable through /media.
const MEDIA_KEY_PATTERN = /^(videos|thumbnails)\/[A-Za-z0-9][A-Za-z0-9_-]{0,80}\.[A-Za-z0-9]{1,5}$/;

export function getDataDir(): string {
  const dir = process.env.CLIPPLAY_DATA_DIR;
  if (!dir) throw new Error('CLIPPLAY_DATA_DIR is not configured');
  return path.resolve(dir);
}

export function isValidMediaKey(key: string): boolean {
  return MEDIA_KEY_PATTERN.test(key);
}

/** Absolute path for a media key, or null when the key is not allowed. */
export function resolveMediaPath(key: string, dataDir: string = getDataDir()): string | null {
  if (!isValidMediaKey(key)) return null;
  const resolved = path.resolve(dataDir, key);
  if (!resolved.startsWith(dataDir + path.sep)) return null;
  return resolved;
}

const CONTENT_TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export function contentTypeForKey(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase() ?? '';
  return CONTENT_TYPES[ext] ?? 'application/octet-stream';
}

export type ByteRange = { start: number; end: number };

/**
 * Parse a single-range `Range: bytes=` header.
 * Returns null when absent (serve whole file), 'invalid' when unsatisfiable.
 */
export function parseRange(header: string | null, size: number): ByteRange | null | 'invalid' {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || size === 0) return 'invalid';
  const [, startStr, endStr] = match;

  if (startStr === '' && endStr === '') return 'invalid';

  if (startStr === '') {
    // suffix range: last N bytes
    const suffix = Number(endStr);
    if (suffix === 0) return 'invalid';
    return { start: Math.max(0, size - suffix), end: size - 1 };
  }

  const start = Number(startStr);
  const end = endStr === '' ? size - 1 : Math.min(Number(endStr), size - 1);
  if (start >= size || start > end) return 'invalid';
  return { start, end };
}
