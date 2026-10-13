"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { toYm } from "@/lib/dates";
import { MonthSheetSchema, type MonthSheet } from "@/lib/schema";
import { normalizeSheet } from "@/lib/sheet";
import {
  LAST_DAYCARE_COOKIE,
  LONG_COOKIE_MAX_AGE,
  editCookieName,
  editToken,
  hashPin,
  newDaycareId,
  verifyPin,
} from "@/lib/server/auth";
import { deleteMonth, getDaycare, insertDaycare, upsertMonth } from "@/lib/server/db";
import { getEnv } from "@/lib/server/env";
import { LIMITS, clientIp, countRecent, recordEvent } from "@/lib/server/limits";
import { canEdit } from "@/lib/server/session";

export type FormState = { error?: string };

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: LONG_COOKIE_MAX_AGE,
};

async function grantEdit(daycareId: string, pinHash: string) {
  const store = await cookies();
  store.set(editCookieName(daycareId), await editToken(daycareId, pinHash), cookieOptions);
  store.set(LAST_DAYCARE_COOKIE, daycareId, cookieOptions);
}

export async function createDaycare(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").replace(/\s+/g, " ").trim();
  const pin = String(formData.get("pin") ?? "").trim();
  if (name.length < 1 || name.length > 30) return { error: "어린이집 이름을 1~30자로 입력해 주세요." };
  if (pin.length < 4 || pin.length > 64) return { error: "관리 비밀번호는 4자 이상으로 정해 주세요." };

  const env = await getEnv();
  const ip = clientIp(await headers());
  if ((await countRecent(env, "create", ip)) >= LIMITS.createPerIp) {
    return { error: "오늘은 어린이집을 더 만들 수 없어요. 내일 다시 시도해 주세요." };
  }

  const { salt, hash } = await hashPin(pin);
  const id = newDaycareId();
  await insertDaycare(env, { id, name, pinSalt: salt, pinHash: hash, createdAt: Date.now() });
  await recordEvent(env, "create", ip);
  await grantEdit(id, hash);
  redirect(`/c/${id}/manage`);
}

export async function unlockDaycare(daycareId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const env = await getEnv();
  const daycare = await getDaycare(env, daycareId);
  if (!daycare) return { error: "어린이집을 찾을 수 없어요." };
  const ip = clientIp(await headers());
  if ((await countRecent(env, "unlock-fail", ip)) >= LIMITS.unlockFailPerIp) {
    return { error: "비밀번호를 너무 많이 틀렸어요. 내일 다시 시도해 주세요." };
  }
  const pin = String(formData.get("pin") ?? "").trim();
  if (!(await verifyPin(pin, daycare.pinSalt, daycare.pinHash))) {
    await recordEvent(env, "unlock-fail", ip);
    return { error: "비밀번호가 맞지 않아요." };
  }
  await grantEdit(daycare.id, daycare.pinHash);
  redirect(`/c/${daycare.id}/manage`);
}

/** 마지막으로 본 어린이집을 서버 쿠키로 기억해 다음 방문 때 "/"에서 바로 열어준다. */
export async function rememberDaycare(daycareId: string): Promise<void> {
  if (!/^[a-z0-9]{4,16}$/.test(daycareId)) return;
  const store = await cookies();
  store.set(LAST_DAYCARE_COOKIE, daycareId, cookieOptions);
}

export async function forgetDaycare(): Promise<void> {
  const store = await cookies();
  store.delete(LAST_DAYCARE_COOKIE);
  redirect("/?pick=1");
}

export type SaveResult = { ok: true; ym: string; firstDate: string | null } | { ok: false; error: string };

export async function saveMonth(
  daycareId: string,
  input: { sheet: MonthSheet; year: number; month: number; imageKey: string | null },
): Promise<SaveResult> {
  const env = await getEnv();
  const daycare = await getDaycare(env, daycareId);
  if (!daycare || !(await canEdit(daycare))) return { ok: false, error: "편집 권한이 없어요. 비밀번호를 다시 입력해 주세요." };

  const year = Number(input.year);
  const month = Number(input.month);
  if (!Number.isInteger(year) || year < 2020 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
    return { ok: false, error: "연도와 월을 확인해 주세요." };
  }
  const parsed = MonthSheetSchema.safeParse(input.sheet);
  if (!parsed.success) return { ok: false, error: "식단 데이터 형식이 올바르지 않아요." };
  if (input.imageKey && !input.imageKey.startsWith(`daycares/${daycare.id}/`)) {
    return { ok: false, error: "원본 사진 정보가 올바르지 않아요." };
  }

  const { sheet } = normalizeSheet(parsed.data, { year, month });
  if (sheet.days.length === 0) return { ok: false, error: "저장할 날짜가 없어요. 연·월이 맞는지 확인해 주세요." };
  const ym = toYm(year, month);
  await upsertMonth(env, daycare.id, ym, sheet, input.imageKey);
  return { ok: true, ym, firstDate: sheet.days[0]?.date ?? null };
}

export async function removeMonth(daycareId: string, ym: string): Promise<{ ok: boolean; error?: string }> {
  const env = await getEnv();
  const daycare = await getDaycare(env, daycareId);
  if (!daycare || !(await canEdit(daycare))) return { ok: false, error: "편집 권한이 없어요." };
  if (!/^\d{4}-\d{2}$/.test(ym)) return { ok: false, error: "잘못된 월이에요." };
  await deleteMonth(env, daycare.id, ym);
  return { ok: true };
}
