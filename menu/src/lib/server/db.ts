import { photoStillStored, todayKST } from "@/lib/dates";
import type { MonthSheet, StoredMonth } from "@/lib/schema";
import type { AppEnv } from "./env";

export type Daycare = { id: string; name: string; pinSalt: string; pinHash: string; createdAt: number };

type DaycareRow = { id: string; name: string; pin_salt: string; pin_hash: string; created_at: number };

function toDaycare(row: DaycareRow): Daycare {
  return { id: row.id, name: row.name, pinSalt: row.pin_salt, pinHash: row.pin_hash, createdAt: row.created_at };
}

export async function getDaycare(env: AppEnv, id: string): Promise<Daycare | null> {
  if (!/^[a-z0-9]{4,16}$/.test(id)) return null;
  const row = await env.DB.prepare("SELECT * FROM daycares WHERE id = ?").bind(id).first<DaycareRow>();
  return row ? toDaycare(row) : null;
}

export async function insertDaycare(env: AppEnv, daycare: Daycare): Promise<void> {
  await env.DB.prepare("INSERT INTO daycares (id, name, pin_salt, pin_hash, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(daycare.id, daycare.name, daycare.pinSalt, daycare.pinHash, daycare.createdAt)
    .run();
}

export async function searchDaycares(env: AppEnv, query: string): Promise<{ id: string; name: string }[]> {
  const q = query.trim();
  if (!q) return [];
  const escaped = q.replace(/[\\%_]/g, (c) => `\\${c}`);
  const { results } = await env.DB.prepare(
    "SELECT id, name FROM daycares WHERE name LIKE ? ESCAPE '\\' ORDER BY created_at LIMIT 20",
  )
    .bind(`%${escaped}%`)
    .all<{ id: string; name: string }>();
  return results;
}

type MenuRow = { ym: string; data: string; image_key: string | null; updated_at: number };

function toStoredMonth(row: MenuRow): StoredMonth {
  return {
    ym: row.ym,
    sheet: JSON.parse(row.data) as MonthSheet,
    imageKey: photoStillStored(row.image_key, todayKST()) ? row.image_key : null,
    updatedAt: row.updated_at,
  };
}

export async function listMonths(env: AppEnv, daycareId: string): Promise<StoredMonth[]> {
  const { results } = await env.DB.prepare(
    "SELECT ym, data, image_key, updated_at FROM menus WHERE daycare_id = ? ORDER BY ym DESC LIMIT 24",
  )
    .bind(daycareId)
    .all<MenuRow>();
  return results.map(toStoredMonth).reverse();
}

export async function getMonth(env: AppEnv, daycareId: string, ym: string): Promise<StoredMonth | null> {
  const row = await env.DB.prepare("SELECT ym, data, image_key, updated_at FROM menus WHERE daycare_id = ? AND ym = ?")
    .bind(daycareId, ym)
    .first<MenuRow>();
  return row ? toStoredMonth(row) : null;
}

export async function upsertMonth(
  env: AppEnv,
  daycareId: string,
  ym: string,
  sheet: MonthSheet,
  imageKey: string | null,
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO menus (daycare_id, ym, data, image_key, updated_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (daycare_id, ym) DO UPDATE SET data = excluded.data,
       image_key = COALESCE(excluded.image_key, menus.image_key), updated_at = excluded.updated_at`,
  )
    .bind(daycareId, ym, JSON.stringify(sheet), imageKey, Date.now())
    .run();
}

export async function deleteMonth(env: AppEnv, daycareId: string, ym: string): Promise<void> {
  await env.DB.prepare("DELETE FROM menus WHERE daycare_id = ? AND ym = ?").bind(daycareId, ym).run();
}
