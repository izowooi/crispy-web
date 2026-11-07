import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Clip, Metadata } from '@/types';
import { getDataDir } from './paths';

const METADATA_FILE = 'metadata.json';

function metadataPath(dataDir: string): string {
  return path.join(dataDir, METADATA_FILE);
}

export function parseMetadata(jsonString: string): Metadata {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('Invalid JSON format');
  }
  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as Metadata).clips)) {
    throw new Error('Missing or invalid clips array');
  }
  const data = parsed as Metadata;
  return { ...data, allowedUploaders: Array.isArray(data.allowedUploaders) ? data.allowedUploaders : [] };
}

export async function readMetadata(dataDir: string = getDataDir()): Promise<Metadata> {
  try {
    return parseMetadata(await fs.readFile(metadataPath(dataDir), 'utf8'));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { clips: [], allowedUploaders: [] };
    }
    throw err;
  }
}

async function writeMetadata(dataDir: string, metadata: Metadata): Promise<void> {
  const target = metadataPath(dataDir);
  const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(metadata, null, 2), 'utf8');
  // Keep the previous version so a bad write can be rolled back by hand.
  await fs.copyFile(target, `${target}.bak`).catch(() => {});
  await fs.rename(tmp, target);
}

// Single pm2 fork instance → an in-process queue is enough to serialize
// read-modify-write cycles on metadata.json.
let queue: Promise<unknown> = Promise.resolve();

export function mutateMetadata<T>(
  mutator: (metadata: Metadata) => T | Promise<T>,
  dataDir: string = getDataDir()
): Promise<T> {
  const run = queue.then(async () => {
    const metadata = await readMetadata(dataDir);
    const result = await mutator(metadata);
    await writeMetadata(dataDir, metadata);
    return result;
  });
  queue = run.catch(() => {});
  return run;
}

export function addClip(clip: Clip, dataDir?: string): Promise<void> {
  return mutateMetadata((m) => {
    m.clips.unshift(clip);
  }, dataDir);
}

export function updateClip(id: string, updates: Partial<Clip>, dataDir?: string): Promise<Clip | null> {
  return mutateMetadata((m) => {
    const index = m.clips.findIndex((c) => c.id === id);
    if (index === -1) return null;
    m.clips[index] = { ...m.clips[index], ...updates, updatedAt: new Date().toISOString() };
    return m.clips[index];
  }, dataDir);
}

export function deleteClip(id: string, dataDir?: string): Promise<Clip | null> {
  return mutateMetadata((m) => {
    const index = m.clips.findIndex((c) => c.id === id);
    if (index === -1) return null;
    const [deleted] = m.clips.splice(index, 1);
    return deleted;
  }, dataDir);
}

/** Clips visible to the requester. Never exposes the uploader allowlist. */
export function visibleClips(metadata: Metadata, isAdmin: boolean): Clip[] {
  return isAdmin ? metadata.clips : metadata.clips.filter((c) => c.isPublic !== false);
}

export function generateClipId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
