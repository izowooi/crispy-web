// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { isValidMediaKey, parseRange, resolveMediaPath } from '@/lib/storage/paths';
import { addClip, deleteClip, readMetadata, updateClip, visibleClips } from '@/lib/storage/metadata';
import { UploadError, writeChunk } from '@/lib/storage/files';
import { Clip } from '@/types';

const clip = (id: string, extra: Partial<Clip> = {}): Clip => ({
  id,
  title: id,
  emoji: '🎬',
  fileKey: `videos/${id}.mp4`,
  fileSize: 1,
  duration: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...extra,
});

const streamOf = (text: string) => new Blob([text]).stream();

describe('media keys', () => {
  it('accepts only videos/ and thumbnails/ keys', () => {
    expect(isValidMediaKey('videos/1787622705739-apdyiew4s.mp4')).toBe(true);
    expect(isValidMediaKey('thumbnails/1787622705739-apdyiew4s.jpg')).toBe(true);
    expect(isValidMediaKey('metadata.json')).toBe(false);
    expect(isValidMediaKey('videos/../metadata.json')).toBe(false);
    expect(isValidMediaKey('videos/a/b.mp4')).toBe(false);
    expect(isValidMediaKey('videos/x.mp4.part')).toBe(false);
  });

  it('resolves inside the data dir only', () => {
    expect(resolveMediaPath('videos/a.mp4', '/data')).toBe('/data/videos/a.mp4');
    expect(resolveMediaPath('../etc/passwd', '/data')).toBeNull();
  });
});

describe('parseRange', () => {
  it('handles absent, open, closed and suffix ranges', () => {
    expect(parseRange(null, 100)).toBeNull();
    expect(parseRange('bytes=0-1', 100)).toEqual({ start: 0, end: 1 });
    expect(parseRange('bytes=10-', 100)).toEqual({ start: 10, end: 99 });
    expect(parseRange('bytes=90-500', 100)).toEqual({ start: 90, end: 99 });
    expect(parseRange('bytes=-10', 100)).toEqual({ start: 90, end: 99 });
  });

  it('rejects unsatisfiable ranges', () => {
    expect(parseRange('bytes=100-', 100)).toBe('invalid');
    expect(parseRange('bytes=5-1', 100)).toBe('invalid');
    expect(parseRange('bytes=0-1,5-6', 100)).toBe('invalid');
  });
});

describe('metadata store', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), 'clipplay-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('returns empty metadata when the file does not exist', async () => {
    expect(await readMetadata(dir)).toEqual({ clips: [], allowedUploaders: [] });
  });

  it('serializes concurrent writes without losing clips', async () => {
    await Promise.all(Array.from({ length: 20 }, (_, i) => addClip(clip(`c${i}`), dir)));
    expect((await readMetadata(dir)).clips).toHaveLength(20);
  });

  it('updates and deletes clips and keeps a backup', async () => {
    await addClip(clip('a'), dir);
    const updated = await updateClip('a', { title: 'new' }, dir);
    expect(updated?.title).toBe('new');
    expect(await updateClip('missing', { title: 'x' }, dir)).toBeNull();
    expect((await deleteClip('a', dir))?.id).toBe('a');
    expect((await readMetadata(dir)).clips).toHaveLength(0);
    expect(JSON.parse(await readFile(path.join(dir, 'metadata.json.bak'), 'utf8')).clips).toHaveLength(1);
  });

  it('hides private clips from non-admins', () => {
    const metadata = { clips: [clip('pub'), clip('priv', { isPublic: false })], allowedUploaders: ['x@y.z'] };
    expect(visibleClips(metadata, false).map((c) => c.id)).toEqual(['pub']);
    expect(visibleClips(metadata, true)).toHaveLength(2);
  });
});

describe('chunked upload', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), 'clipplay-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('assembles chunks and only exposes the file when complete', async () => {
    const key = 'thumbnails/abc.jpg';
    const first = await writeChunk(key, 0, 10, streamOf('hello'), dir);
    expect(first).toEqual({ received: 5, complete: false });
    await expect(stat(path.join(dir, key))).rejects.toThrow();

    const second = await writeChunk(key, 5, 10, streamOf('world'), dir);
    expect(second).toEqual({ received: 10, complete: true });
    expect(await readFile(path.join(dir, key), 'utf8')).toBe('helloworld');
  });

  it('rejects out-of-order chunks and bad keys', async () => {
    await writeChunk('thumbnails/abc.jpg', 0, 10, streamOf('hello'), dir);
    await expect(writeChunk('thumbnails/abc.jpg', 7, 10, streamOf('xyz'), dir)).rejects.toMatchObject({ status: 409 });
    await expect(writeChunk('metadata.json', 0, 3, streamOf('{}'), dir)).rejects.toBeInstanceOf(UploadError);
  });

  it('restarts from scratch when offset 0 is sent again', async () => {
    await writeFile(path.join(dir, 'x'), '');
    await writeChunk('thumbnails/r.jpg', 0, 4, streamOf('ab'), dir);
    const res = await writeChunk('thumbnails/r.jpg', 0, 4, streamOf('abcd'), dir);
    expect(res).toEqual({ received: 4, complete: true });
  });
});
