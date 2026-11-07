import { createWriteStream, promises as fs } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { execFile } from 'node:child_process';
import { getDataDir, resolveMediaPath } from './paths';

export class UploadError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export interface ChunkResult {
  received: number;
  complete: boolean;
}

/**
 * Append one chunk of a file upload. Chunks must arrive in order; the file only
 * appears at its final key once the last byte is written (atomic rename), so
 * readers never see a partial video.
 *
 * Chunking exists because the Cloudflare proxy caps request bodies at ~100MB.
 */
export async function writeChunk(
  key: string,
  offset: number,
  total: number,
  body: ReadableStream<Uint8Array> | null,
  dataDir: string = getDataDir()
): Promise<ChunkResult> {
  const finalPath = resolveMediaPath(key, dataDir);
  if (!finalPath) throw new UploadError('Invalid key', 400);
  if (!body) throw new UploadError('Empty body', 400);
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(total) || offset < 0 || total <= 0 || offset >= total) {
    throw new UploadError('Invalid offset/total', 400);
  }

  const partPath = `${finalPath}.part`;
  await fs.mkdir(path.dirname(finalPath), { recursive: true });

  const existing = await fs.stat(partPath).then((s) => s.size).catch(() => 0);
  if (offset === 0 && existing > 0) {
    await fs.rm(partPath, { force: true });
  } else if (offset !== existing) {
    throw new UploadError(`Offset mismatch: expected ${existing}`, 409);
  }

  await pipeline(
    Readable.fromWeb(body as import('node:stream/web').ReadableStream<Uint8Array>),
    createWriteStream(partPath, { flags: offset === 0 ? 'w' : 'a' })
  );

  const received = (await fs.stat(partPath)).size;
  if (received > total) {
    await fs.rm(partPath, { force: true });
    throw new UploadError('Received more bytes than declared', 400);
  }

  const complete = received === total;
  if (complete) await finalizeFile(partPath, finalPath);
  return { received, complete };
}

export async function deleteMediaFile(key: string | undefined, dataDir: string = getDataDir()): Promise<void> {
  if (!key) return;
  const filePath = resolveMediaPath(key, dataDir);
  if (!filePath) return;
  await fs.rm(filePath, { force: true });
}

/**
 * Move the moov atom to the front so playback starts before the whole file
 * downloads. Done before the file becomes visible because media is served with
 * an immutable cache header. Falls back to the original bytes when ffmpeg is
 * unavailable or fails.
 */
async function finalizeFile(partPath: string, finalPath: string): Promise<void> {
  if (/\.(mp4|m4v|mov)$/i.test(finalPath)) {
    const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
    const tmp = `${finalPath}.faststart${path.extname(finalPath)}`;
    const ok = await new Promise<boolean>((resolve) => {
      execFile(
        ffmpeg,
        ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'mov,mp4,m4a,3gp,3g2,mj2', '-i', partPath, '-map', '0', '-c', 'copy', '-movflags', '+faststart', tmp],
        { timeout: 10 * 60 * 1000 },
        (err) => {
          if (err) console.error(`faststart failed for ${finalPath}:`, err.message);
          resolve(!err);
        }
      );
    });
    if (ok) {
      await fs.rename(tmp, finalPath);
      await fs.rm(partPath, { force: true });
      return;
    }
    await fs.rm(tmp, { force: true });
  }
  await fs.rename(partPath, finalPath);
}
