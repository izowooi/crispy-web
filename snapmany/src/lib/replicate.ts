// server-only
// Replicate SDK wrapper. 클라이언트 컴포넌트에서 절대 import 금지.
// 사용처는 `src/app/api/**/route.ts`와 같은 서버 모듈로 한정.
// `REPLICATE_API_TOKEN`은 이 파일과 route handler 내부에서만 읽는다.

import Replicate from "replicate";
import { getStylePrompt, type AspectRatio } from "@/lib/stylePrompts";

const DEFAULT_MODEL = "openai/gpt-image-2" as const;
const DEFAULT_ASPECT_RATIO: AspectRatio = "1:1";
// gpt-image-2는 일반적으로 30~90초가 걸린다. 60초로 두면 정상 응답도 잘림.
// 120초로 두고, 1회 재시도까지 총 약 240초가 최대치(클라이언트는 부분 실패를 격리한다).
const DEFAULT_TIMEOUT_MS = 120_000;

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

  // 3) 객체 형태 — Replicate SDK 1.x의 FileOutput은 ReadableStream을 확장하며
  //    `.url(): URL` 메서드를 노출한다. 일부 변형은 `url: string` 속성으로 노출.
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

    // 4) 마지막 폴백: toString이 http(s) URL을 반환하는 경우
    try {
      const str = String(output);
      if (/^https?:\/\//.test(str)) return str;
    } catch {
      // ignore
    }
  }

  return null;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Replicate request timed out after ${ms}ms`));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  }) as Promise<T>;
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

  const runPromise = client.run(DEFAULT_MODEL, {
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

  const output = await withTimeout(runPromise as Promise<unknown>, DEFAULT_TIMEOUT_MS);
  const imageUrl = extractFirstUrl(output);
  if (imageUrl === null) {
    throw new Error("Replicate returned no usable image URL.");
  }
  return { imageUrl };
}
