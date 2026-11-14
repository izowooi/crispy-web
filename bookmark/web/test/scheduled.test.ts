import { createScheduledController, env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import worker from "../worker/index";
import { DAY, sha256Hex } from "../worker/util";
import { createSession } from "../worker/session";
import { seedUser } from "./seed";

async function insertBookmark(userId: string, id: string, deletedAt: number | null) {
  await env.DB.prepare("INSERT INTO bookmarks (id, user_id, url, created_at, deleted_at) VALUES (?, ?, ?, ?, ?)")
    .bind(id, userId, `https://example.com/${id}`, Date.now(), deletedAt)
    .run();
}

const exists = async (table: string, column: string, value: string) =>
  (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${column} = ?`).bind(value).first<{ n: number }>())!.n === 1;

async function runScheduled() {
  await worker.scheduled(createScheduledController({ scheduledTime: Date.now(), cron: "17 19 * * *" }), env);
}

describe("scheduled cleanup", () => {
  it("purges bookmarks soft-deleted more than 30 days ago and keeps the rest", async () => {
    const user = await seedUser("cleanup-bookmarks@example.com");
    const now = Date.now();
    await insertBookmark(user.id, "old-deleted", now - 31 * DAY);
    await insertBookmark(user.id, "recent-deleted", now - 29 * DAY);
    await insertBookmark(user.id, "just-deleted", now - 1000);
    await insertBookmark(user.id, "live-bookmark", null);

    await runScheduled();

    expect(await exists("bookmarks", "id", "old-deleted")).toBe(false);
    expect(await exists("bookmarks", "id", "recent-deleted")).toBe(true);
    expect(await exists("bookmarks", "id", "just-deleted")).toBe(true);
    expect(await exists("bookmarks", "id", "live-bookmark")).toBe(true);
  });

  it("removes expired sessions but keeps valid ones", async () => {
    const user = await seedUser("cleanup-sessions@example.com");
    const expiredToken = await createSession(env.DB, user.id, "device", "expired");
    const expiredHash = await sha256Hex(expiredToken);
    await env.DB.prepare("UPDATE sessions SET expires_at = ? WHERE token_hash = ?").bind(Date.now() - 1000, expiredHash).run();
    const validHash = await sha256Hex(user.token);

    await runScheduled();

    expect(await exists("sessions", "token_hash", expiredHash)).toBe(false);
    expect(await exists("sessions", "token_hash", validHash)).toBe(true);
  });

  it("removes expired auth codes but keeps pending ones", async () => {
    const user = await seedUser("cleanup-codes@example.com");
    const insert = (hash: string, expiresAt: number) =>
      env.DB.prepare("INSERT INTO auth_codes (code_hash, user_id, challenge, label, expires_at) VALUES (?, ?, 'c', '', ?)").bind(hash, user.id, expiresAt).run();
    await insert("expired-code", Date.now() - 1000);
    await insert("pending-code", Date.now() + 60_000);

    await runScheduled();

    expect(await exists("auth_codes", "code_hash", "expired-code")).toBe(false);
    expect(await exists("auth_codes", "code_hash", "pending-code")).toBe(true);
  });
});
