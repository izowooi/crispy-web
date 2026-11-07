import { createReadStream, promises as fs } from 'node:fs';
import { Readable } from 'node:stream';
import { NextRequest } from 'next/server';
import { contentTypeForKey, parseRange, resolveMediaPath } from '@/lib/storage/paths';

interface RouteParams {
  params: Promise<{ key: string[] }>;
}

// Keys are unique per upload (thumbnails get ?v=updatedAt), so the CDN edge can
// keep them forever and spare the home uplink.
const CACHE_CONTROL = 'public, max-age=31536000, immutable';

async function serve(request: NextRequest, { params }: RouteParams, includeBody: boolean) {
  const { key } = await params;
  const filePath = resolveMediaPath(key.join('/'));
  if (!filePath) return new Response('Not found', { status: 404 });

  const stat = await fs.stat(filePath).catch(() => null);
  if (!stat || !stat.isFile()) return new Response('Not found', { status: 404 });

  const size = stat.size;
  const headers = new Headers({
    'Content-Type': contentTypeForKey(filePath),
    'Accept-Ranges': 'bytes',
    'Cache-Control': CACHE_CONTROL,
    'Last-Modified': stat.mtime.toUTCString(),
    ETag: `"${size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`,
  });

  const range = parseRange(request.headers.get('range'), size);
  if (range === 'invalid') {
    headers.set('Content-Range', `bytes */${size}`);
    return new Response(null, { status: 416, headers });
  }

  const start = range?.start ?? 0;
  const end = range?.end ?? size - 1;
  headers.set('Content-Length', String(size === 0 ? 0 : end - start + 1));
  if (range) headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
  const status = range ? 206 : 200;

  if (!includeBody || size === 0) return new Response(null, { status, headers });

  const stream = createReadStream(filePath, { start, end });
  request.signal.addEventListener('abort', () => stream.destroy());
  return new Response(Readable.toWeb(stream) as ReadableStream, { status, headers });
}

export function GET(request: NextRequest, ctx: RouteParams) {
  return serve(request, ctx, true);
}

export function HEAD(request: NextRequest, ctx: RouteParams) {
  return serve(request, ctx, false);
}
