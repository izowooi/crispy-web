export const runtime = "edge";

import { generateStyledImage } from "@/lib/replicate";
import { isKnownStyleId } from "@/config/styles";

// 응답 shape — `_workspace/00_architect_decisions.md` §6, `_workspace/03_R1_backend_done.md` §4와 동결.
type GenerateResponseOk = { ok: true; styleId: string; imageUrl: string };
type GenerateResponseErr = { ok: false; styleId: string; error: string };

const MAX_UPLOAD_SIZE_MB = 10;
const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
const DATA_URL_PREFIX_RE = /^data:image\/(jpeg|png|webp);base64,/;

const ERROR_BAD_FORMAT = "잘못된 이미지 형식입니다";
const ERROR_UNKNOWN_STYLE = "알 수 없는 스타일입니다";
const ERROR_TOO_LARGE = "파일이 너무 큽니다";
const ERROR_TIMEOUT = "시간이 초과되었습니다";
const ERROR_SERVER_CONFIG = "서버 설정 오류입니다";
const ERROR_GENERATION = "생성에 실패했습니다";
const ERROR_BAD_REQUEST = "잘못된 요청입니다";

function jsonResponse(body: GenerateResponseOk | GenerateResponseErr, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function estimateBase64ByteLength(image: string): number {
  const commaIdx = image.indexOf(",");
  const base64Part = commaIdx >= 0 ? image.slice(commaIdx + 1) : "";
  if (base64Part.length === 0) return 0;
  const paddingMatch = base64Part.match(/=+$/);
  const padding = paddingMatch ? paddingMatch[0].length : 0;
  return Math.floor((base64Part.length * 3) / 4) - padding;
}

function isTimeoutError(err: unknown): boolean {
  if (err instanceof Error) {
    if (err.name === "AbortError") return true;
    return /timed out|timeout/i.test(err.message);
  }
  return false;
}

function isServerConfigError(err: unknown): boolean {
  if (err instanceof Error) {
    return /not configured|REPLICATE_API_TOKEN/i.test(err.message);
  }
  return false;
}

async function callWithRetry(
  image: string,
  styleId: string
): Promise<{ imageUrl: string }> {
  try {
    return await generateStyledImage({ image, styleId });
  } catch (firstErr) {
    // Timeout / config 오류는 재시도하지 않는다.
    if (isTimeoutError(firstErr) || isServerConfigError(firstErr)) {
      throw firstErr;
    }
    // 그 외 (Replicate 5xx 등 일시 오류 추정) → 1회 재시도.
    return await generateStyledImage({ image, styleId });
  }
}

export async function POST(req: Request): Promise<Response> {
  // 1) JSON 파싱
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(
      { ok: false, styleId: "", error: ERROR_BAD_REQUEST },
      400
    );
  }

  if (typeof body !== "object" || body === null) {
    return jsonResponse(
      { ok: false, styleId: "", error: ERROR_BAD_REQUEST },
      400
    );
  }

  const rawImage = (body as Record<string, unknown>).image;
  const rawStyleId = (body as Record<string, unknown>).styleId;

  // 2) styleId 타입 검사
  if (typeof rawStyleId !== "string" || rawStyleId.length === 0) {
    return jsonResponse(
      { ok: false, styleId: "", error: ERROR_UNKNOWN_STYLE },
      400
    );
  }
  const styleId = rawStyleId;

  // 3) image 타입/형식 검사
  if (typeof rawImage !== "string" || rawImage.length === 0) {
    return jsonResponse(
      { ok: false, styleId, error: ERROR_BAD_FORMAT },
      400
    );
  }
  if (!DATA_URL_PREFIX_RE.test(rawImage)) {
    return jsonResponse(
      { ok: false, styleId, error: ERROR_BAD_FORMAT },
      400
    );
  }

  // 4) 크기 검사
  const byteLength = estimateBase64ByteLength(rawImage);
  if (byteLength > MAX_UPLOAD_SIZE_BYTES) {
    return jsonResponse(
      { ok: false, styleId, error: ERROR_TOO_LARGE },
      413
    );
  }

  // 5) styleId 허용 목록 검사
  if (!isKnownStyleId(styleId)) {
    return jsonResponse(
      { ok: false, styleId, error: ERROR_UNKNOWN_STYLE },
      400
    );
  }

  // 6) Replicate 호출 (1회 재시도 포함)
  try {
    const { imageUrl } = await callWithRetry(rawImage, styleId);
    return jsonResponse({ ok: true, styleId, imageUrl }, 200);
  } catch (err) {
    if (isTimeoutError(err)) {
      return jsonResponse({ ok: false, styleId, error: ERROR_TIMEOUT }, 504);
    }
    if (isServerConfigError(err)) {
      return jsonResponse(
        { ok: false, styleId, error: ERROR_SERVER_CONFIG },
        500
      );
    }
    return jsonResponse({ ok: false, styleId, error: ERROR_GENERATION }, 502);
  }
}

export async function GET(): Promise<Response> {
  return jsonResponse(
    { ok: false, styleId: "", error: "Method Not Allowed" },
    405
  );
}
