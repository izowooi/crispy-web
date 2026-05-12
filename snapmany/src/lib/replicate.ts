// server-only
// Replicate SDK wrapper. 클라이언트 컴포넌트에서 절대 import 금지.
// 사용처는 `src/app/api/**/route.ts`와 같은 서버 모듈로 한정.
// `REPLICATE_API_TOKEN`은 이 파일과 route handler 내부에서만 읽는다.
//
// 호출 패턴 (D-CFW-1):
//   `client.run()`은 SDK 내부에서 streaming/long polling을 사용하는데
//   Cloudflare Workers edge runtime에서 즉시 reject되는 사례가 확인됨
//   (snapmany 첫 production 배포에서 wallTime ~3 s, cpuTime 9 ms로 502).
//   대신 ductcanvas에서 검증된 `predictions.create + predictions.get` 폴링 패턴을 채택한다.

import Replicate, { type Prediction } from "replicate";
import { getStylePrompt, type AspectRatio } from "@/lib/stylePrompts";

const DEFAULT_MODEL = "openai/gpt-image-2" as const;
const DEFAULT_ASPECT_RATIO: AspectRatio = "1:1";
// gpt-image-2는 일반적으로 30~90초가 걸린다. 120초로 두고, 1회 재시도까지 총 약 240초가 최대치
// (클라이언트는 부분 실패를 격리한다).
const DEFAULT_TIMEOUT_MS = 120_000;
// 폴링 간격. 너무 짧으면 Replicate API rate에 부담, 너무 길면 응답 지연. 1.5 s 정도가 무난.
const POLL_INTERVAL_MS = 1_500;
// 폴링 시작 전 첫 대기. 첫 predictions.create 직후 보통 즉시는 starting 상태이므로
// 곧바로 polling 하면 무의미한 라운드트립이 1번 발생. 1 s 정도 둠.
const FIRST_POLL_DELAY_MS = 1_000;
// Rate-limit 재시도 정책 (D-RL-1):
//   Replicate는 신용 잔액이 적으면 "burst: 1, 6 RPM"으로 강하게 throttle한다.
//   응답이 429이면 메시지에 retry_after 초가 포함되므로 그만큼 sleep 후 1회 재시도.
//   재시도까지 실패하면 호출자에게 throw → route handler가 502로 변환.
const MAX_RATE_LIMIT_RETRIES = 1;
// retry_after를 못 읽었을 때의 안전 기본값.
const DEFAULT_RETRY_AFTER_SEC = 10;
// retry_after 상한. 비정상 큰 값으로 인한 사용자 대기 폭증 방지.
const MAX_RETRY_AFTER_SEC = 30;

export type GenerateStyledImageInput = {
  readonly image: string;
  readonly styleId: string;
};

export type GenerateStyledImageResult = {
  readonly imageUrl: string;
};

// 모듈 스코프 싱글톤. token이 비어있으면 즉시 throw해서 호출부에서 500으로 변환되도록.
let cachedClient: Replicate | null = null;

function getReplicateClient(): Replicate {
  if (cachedClient !== null) return cachedClient;
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token || token.length === 0) {
    throw new Error(
      "REPLICATE_API_TOKEN is not configured. Server cannot reach Replicate."
    );
  }
  cachedClient = new Replicate({ auth: token });
  return cachedClient;
}

function extractFirstUrl(output: unknown): string | null {
  if (output == null) return null;

  // 1) 평문 URL 문자열
  if (typeof output === "string") {
    return output.length > 0 ? output : null;
  }

  // 2) 배열 → 첫 원소를 재귀 처리 (Replicate SDK 1.x는 보통 길이 1의 배열)
  if (Array.isArray(output)) {
    return output.length > 0 ? extractFirstUrl(output[0]) : null;
  }

  // 3) 객체 형태 — FileOutput-like (.url() 또는 .url string), 또는 toString이 URL인 경우.
  if (typeof output === "object") {
    const maybeUrl = (output as { url?: unknown }).url;

    if (typeof maybeUrl === "function") {
      try {
        const u = (maybeUrl as () => unknown).call(output);
        if (typeof u === "string" && u.length > 0) return u;
        if (u && typeof u === "object" && typeof (u as URL).href === "string" && (u as URL).href.length > 0) {
          return (u as URL).href;
        }
      } catch {
        // ignore — toString 폴백으로 진행
      }
    }
    if (typeof maybeUrl === "string" && maybeUrl.length > 0) {
      return maybeUrl;
    }

    try {
      const str = String(output);
      if (/^https?:\/\//.test(str)) return str;
    } catch {
      // ignore
    }
  }

  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

type TerminalStatus = "succeeded" | "failed" | "canceled";
function isTerminal(status: Prediction["status"]): status is TerminalStatus {
  return status === "succeeded" || status === "failed" || status === "canceled";
}

/**
 * Replicate ApiError에서 rate-limit (429) 여부와 retry_after 초를 뽑아낸다.
 *
 * SDK 1.x의 ApiError는 status 속성을 가질 수도 있고 안 가질 수도 있다.
 * 메시지 패턴이 가장 확실 — 사용자 production 로그 기준:
 *   "Request to ... failed with status 429 Too Many Requests: {"detail":"...","status":429,"retry_after":9}"
 */
export function parseRateLimit(err: unknown): { isRateLimit: boolean; retryAfterSec: number } {
  if (err == null || typeof err !== "object") {
    return { isRateLimit: false, retryAfterSec: 0 };
  }

  // 1) ApiError 객체의 status 속성 (있으면 가장 신뢰)
  const maybeStatus = (err as { status?: unknown }).status;
  // 2) 메시지 패턴
  const message = err instanceof Error ? err.message : "";

  const looks429 =
    maybeStatus === 429 ||
    /\bstatus\s+429\b/i.test(message) ||
    /429\s+Too\s+Many/i.test(message);

  if (!looks429) return { isRateLimit: false, retryAfterSec: 0 };

  // retry_after는 응답 본문 JSON에 들어있다. 메시지에서 `"retry_after":N` 패턴 추출.
  // 못 찾으면 안전 기본값.
  let raw = DEFAULT_RETRY_AFTER_SEC;
  const m = message.match(/"retry_after"\s*:\s*(\d+(?:\.\d+)?)/);
  if (m) {
    const v = Number(m[1]);
    if (Number.isFinite(v) && v > 0) raw = Math.ceil(v);
  }
  // 사용자 대기 시간이 폭증하지 않도록 cap. 또한 +1초 버퍼.
  const retryAfterSec = Math.min(raw + 1, MAX_RETRY_AFTER_SEC);
  return { isRateLimit: true, retryAfterSec };
}

/**
 * predictions.create를 호출하되, 429 응답일 때만 retry_after 초만큼 sleep 후 1회 재시도.
 * 그 외 에러는 즉시 throw — route handler의 일반 retry/timeout 로직이 처리한다.
 */
async function createPredictionWithRateLimitRetry(
  client: Replicate,
  options: Parameters<Replicate["predictions"]["create"]>[0]
): Promise<Prediction> {
  for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt++) {
    try {
      return await client.predictions.create(options);
    } catch (err) {
      const { isRateLimit, retryAfterSec } = parseRateLimit(err);
      if (!isRateLimit || attempt >= MAX_RATE_LIMIT_RETRIES) {
        throw err;
      }
      await sleep(retryAfterSec * 1000);
    }
  }
  // 이 라인은 도달 불가 (위 루프가 return 또는 throw). 타입 안전을 위해 throw.
  throw new Error("createPredictionWithRateLimitRetry: unreachable");
}

export async function generateStyledImage(
  input: GenerateStyledImageInput
): Promise<GenerateStyledImageResult> {
  const stylePrompt = getStylePrompt(input.styleId);
  if (stylePrompt === null) {
    throw new Error(`Unknown styleId: ${input.styleId}`);
  }

  const client = getReplicateClient();
  const aspectRatio: AspectRatio = stylePrompt.aspectRatio ?? DEFAULT_ASPECT_RATIO;
  const start = Date.now();

  // 1) prediction 생성 — 짧은 단일 fetch. edge에서 안정적.
  //    429 응답이면 retry_after 초 sleep 후 1회 재시도.
  let prediction = await createPredictionWithRateLimitRetry(client, {
    model: DEFAULT_MODEL,
    input: {
      prompt: stylePrompt.prompt,
      input_images: [input.image],
      aspect_ratio: aspectRatio,
      number_of_images: 1,
      output_format: "webp",
      output_compression: 90,
      quality: "auto",
      moderation: "auto",
    },
  });

  // 2) 첫 라운드는 짧게 양보, 이후 일정 간격으로 polling.
  if (!isTerminal(prediction.status)) {
    await sleep(FIRST_POLL_DELAY_MS);
  }

  while (!isTerminal(prediction.status)) {
    if (Date.now() - start > DEFAULT_TIMEOUT_MS) {
      throw new Error(`Replicate request timed out after ${DEFAULT_TIMEOUT_MS}ms`);
    }
    await sleep(POLL_INTERVAL_MS);
    prediction = await client.predictions.get(prediction.id);
  }

  if (prediction.status !== "succeeded") {
    const reason = prediction.error ?? prediction.status;
    throw new Error(`Replicate prediction ${prediction.status}: ${String(reason)}`);
  }

  const imageUrl = extractFirstUrl(prediction.output);
  if (imageUrl === null) {
    throw new Error("Replicate returned no usable image URL.");
  }
  return { imageUrl };
}
