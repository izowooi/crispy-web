import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database } from "@cloudflare/workers-types";

// Schema lives in migrations/*.sql (wrangler d1 migrations). Every table is prefixed with im_.
export type { D1Database };

export const PENDING_TTL_MS = 10 * 60 * 1000;

const globalForDb = globalThis as unknown as { __infiniteMergeTestDb?: D1Database };

/**
 * The D1 binding `DB` from wrangler.jsonc. On Workers it is the real database; under `next dev`
 * initOpenNextCloudflareForDev() provides it (local miniflare file, or the remote database when
 * IM_D1=remote).
 */
export function getDb(): D1Database {
  if (globalForDb.__infiniteMergeTestDb) return globalForDb.__infiniteMergeTestDb;
  const db = getCloudflareContext().env.DB;
  if (!db) throw new Error("D1 binding DB is missing: check d1_databases in wrangler.jsonc");
  return db;
}

/** Test hook: swap in an isolated database. */
export function setDbForTests(db: D1Database | undefined): void {
  globalForDb.__infiniteMergeTestDb = db;
}
