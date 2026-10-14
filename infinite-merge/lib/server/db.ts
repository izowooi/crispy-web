import "server-only";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { BASE_ELEMENTS } from "@/lib/elements";
import { dataDir } from "./config";

// Plain SQLite on purpose: the same schema can move to Cloudflare D1 later.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS elements (
  name TEXT PRIMARY KEY,
  emoji TEXT NOT NULL,
  desc TEXT,
  created_at INTEGER NOT NULL,
  first_by_sub TEXT
);
CREATE TABLE IF NOT EXISTS recipes (
  pair_key TEXT PRIMARY KEY,
  a TEXT NOT NULL,
  b TEXT NOT NULL,
  result_name TEXT NOT NULL REFERENCES elements(name),
  model TEXT,
  created_at INTEGER NOT NULL,
  created_by_sub TEXT
);
CREATE TABLE IF NOT EXISTS discoveries (
  sub TEXT NOT NULL,
  element_name TEXT NOT NULL REFERENCES elements(name),
  discovered_at INTEGER NOT NULL,
  first_discovery INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (sub, element_name)
);
CREATE TABLE IF NOT EXISTS accounts (
  sub TEXT PRIMARY KEY,
  email TEXT,
  name TEXT,
  picture TEXT,
  client_id TEXT,
  selected_model TEXT,
  created_at INTEGER NOT NULL,
  last_login_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  sub TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS oauth_pending (
  state TEXT PRIMARY KEY,
  nonce TEXT NOT NULL,
  verifier TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  client_id TEXT NOT NULL,
  account_sub TEXT,
  created_at INTEGER NOT NULL
);

-- Guest (operator-paid) model calls per KST day; scope is a guest sub or '*' for the global total.
CREATE TABLE IF NOT EXISTS guest_usage (
  day TEXT NOT NULL,
  scope TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, scope)
);
`;

export const PENDING_TTL_MS = 10 * 60 * 1000;

export function openDatabase(file: string): DatabaseSync {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(file);
  if (file !== ":memory:") db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  const seed = db.prepare(
    "INSERT OR IGNORE INTO elements (name, emoji, desc, created_at, first_by_sub) VALUES (?, ?, ?, 0, NULL)",
  );
  for (const e of BASE_ELEMENTS) seed.run(e.name, e.emoji, e.desc ?? null);
  return db;
}

const globalForDb = globalThis as unknown as { __infiniteMergeDb?: DatabaseSync };

// Cached on globalThis so dev HMR doesn't open a new handle per reload.
export function getDb(): DatabaseSync {
  if (!globalForDb.__infiniteMergeDb) {
    globalForDb.__infiniteMergeDb = openDatabase(path.join(dataDir(), "infinite-merge.db"));
  }
  return globalForDb.__infiniteMergeDb;
}

/** Test hook: swap in an isolated database. */
export function setDbForTests(db: DatabaseSync | undefined): void {
  globalForDb.__infiniteMergeDb = db;
}

export function transaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
