// server-only
// Replicate SDK wrapper. 클라이언트 컴포넌트에서 절대 import 금지.
// 사용처는 `src/app/api/**/route.ts`와 같은 서버 모듈로 한정.
// `REPLICATE_API_TOKEN`은 이 파일과 route handler 내부에서만 읽는다.

import Replicate from "replicate";
import { getStylePrompt, type AspectRatio } from "@/lib/stylePrompts";

const DEFAULT_MODEL = "openai/gpt-image-2" as const;
const DEFAULT_ASPECT_RATIO: AspectRatio = "1:1";
const DEFAULT_TIMEOUT_MS = 60_000;

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
  if (typeof output === "string" && output.length > 0) {
    return output;
  }
  if (Array.isArray(output) && output.length > 0) {
    const first = output[0];
    if (typeof first === "string" && first.length > 0) {
      return first;
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
