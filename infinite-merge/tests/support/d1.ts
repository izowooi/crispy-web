// A node:sqlite-backed stand-in for the D1 binding, so unit tests stay fast and offline.
// It mirrors the D1 behaviors the app relies on; real D1 is exercised by `npm run preview` and the hosted smoke test.
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import type { D1Database } from "@cloudflare/workers-types";

type Meta = { changes: number; last_row_id: number; rows_read: number; rows_written: number; duration: number };
type Result = { results: Record<string, unknown>[]; success: true; meta: Meta };

const MIGRATIONS_DIR = path.resolve(import.meta.dirname, "../../migrations");

function toPlain(row: Record<string, unknown>): Record<string, unknown> {
  return { ...row }; // node:sqlite rows have a null prototype; D1 rows are plain objects
}

class Statement {
  constructor(
    private readonly db: DatabaseSync,
    readonly sql: string,
    private readonly params: SQLInputValue[] = [],
  ) {}

  bind(...values: unknown[]): Statement {
    // D1 rejects undefined bindings ("D1_TYPE_ERROR"); catching that here keeps tests honest.
    values.forEach((v, i) => {
      if (v === undefined) throw new Error(`D1_TYPE_ERROR: undefined binding at index ${i} in: ${this.sql}`);
    });
    return new Statement(this.db, this.sql, values as SQLInputValue[]);
  }

  execute(): Result {
    const stmt = this.db.prepare(this.sql);
    // Real D1 reports meta.changes including rows touched by triggers (an im_elements insert reports 2),
    // unlike sqlite3_changes(). Measure the total_changes() delta to match.
    const before = this.totalChanges();
    if (/^\s*(select|with)\b|\breturning\b/i.test(this.sql)) {
      const rows = (stmt.all(...this.params) as Record<string, unknown>[]).map(toPlain);
      return { results: rows, success: true, meta: meta(this.totalChanges() - before, 0) };
    }
    const r = stmt.run(...this.params);
    return { results: [], success: true, meta: meta(this.totalChanges() - before, Number(r.lastInsertRowid)) };
  }

  private totalChanges(): number {
    return Number((this.db.prepare("SELECT total_changes() AS n").get() as { n: number }).n);
  }

  async first<T>(column?: string): Promise<T | null> {
    const row = this.execute().results[0];
    if (!row) return null;
    return (column ? (row[column] ?? null) : row) as T;
  }

  async all(): Promise<Result> {
    return this.execute();
  }

  async run(): Promise<Result> {
    return this.execute();
  }

  async raw(): Promise<unknown[][]> {
    return this.execute().results.map((r) => Object.values(r));
  }
}

function meta(changes: number, lastRowId: number): Meta {
  return { changes, last_row_id: lastRowId, rows_read: 0, rows_written: 0, duration: 0 };
}

/** Fresh in-memory database with every migration applied, exactly as `wrangler d1 migrations apply` would. */
export function createTestD1(): D1Database {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;"); // D1 always enforces foreign keys
  for (const file of fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort()) {
    db.exec(fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8"));
  }
  const d1 = {
    prepare: (sql: string) => new Statement(db, sql),
    // D1 runs a batch as a single transaction: all statements commit, or none do.
    async batch(statements: Statement[]) {
      db.exec("BEGIN");
      try {
        const results = statements.map((s) => s.execute());
        db.exec("COMMIT");
        return results;
      } catch (err) {
        db.exec("ROLLBACK");
        throw err;
      }
    },
    async exec(sql: string) {
      db.exec(sql);
      return { count: 0, duration: 0 };
    },
  };
  return d1 as unknown as D1Database;
}
