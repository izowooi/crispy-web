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
  let prediction = await client.predictions.create({
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
