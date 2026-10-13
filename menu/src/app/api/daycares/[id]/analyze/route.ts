import { NextResponse } from "next/server";
import { todayKST } from "@/lib/dates";
import { normalizeSheet } from "@/lib/sheet";
import { getDaycare } from "@/lib/server/db";
import { claudeConfig, getEnv } from "@/lib/server/env";
import { ExtractError, extractMonthSheet } from "@/lib/server/extract";
import { LIMITS, countRecent, recordEvent } from "@/lib/server/limits";
import { canEdit } from "@/lib/server/session";

const MAX_BYTES = 6 * 1024 * 1024;
const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type MediaType = (typeof MEDIA_TYPES)[number];

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const env = await getEnv();
  const daycare = await getDaycare(env, id);
  if (!daycare) return fail("어린이집을 찾을 수 없어요.", 404);
  if (!(await canEdit(daycare))) return fail("편집 권한이 없어요. 비밀번호를 다시 입력해 주세요.", 401);

  const form = await request.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File)) return fail("사진 파일이 필요해요.", 400);
  if (file.size > MAX_BYTES) return fail("사진이 너무 커요(최대 6MB).", 413);
  if (!MEDIA_TYPES.includes(file.type as MediaType)) return fail("JPG, PNG, WEBP 사진만 올릴 수 있어요.", 415);

  if ((await countRecent(env, "analyze", daycare.id)) >= LIMITS.analyzePerDaycare) {
    return fail("오늘 분석 횟수를 모두 썼어요. 내일 다시 시도하거나 직접 수정해 주세요.", 429);
  }
  if ((await countRecent(env, "analyze", "*")) >= LIMITS.analyzeGlobal) {
    return fail("오늘 전체 분석 한도에 도달했어요. 내일 다시 시도해 주세요.", 429);
  }
  await recordEvent(env, "analyze", daycare.id);
  await recordEvent(env, "analyze", "*");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const imageKey = `daycares/${daycare.id}/${todayKST()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  await env.IMAGES.put(imageKey, bytes, { httpMetadata: { contentType: file.type } });

  const today = todayKST();
  const hintYear = Number(form?.get("year")) || Number(today.slice(0, 4));
  const hintMonth = Number(form?.get("month")) || Number(today.slice(5, 7));

  try {
    const { apiKey, model } = claudeConfig(env);
    const raw = await extractMonthSheet({
      apiKey,
      model,
      imageBase64: toBase64(bytes),
      mediaType: file.type as MediaType,
      hint: { year: hintYear, month: hintMonth },
    });
    const { sheet, warnings } = normalizeSheet(raw);
    return NextResponse.json({ sheet, warnings, imageKey });
  } catch (error) {
    if (error instanceof ExtractError) return fail(error.message, 502);
    console.error("analyze failed", error);
    return fail("분석 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.", 500);
  }
}
