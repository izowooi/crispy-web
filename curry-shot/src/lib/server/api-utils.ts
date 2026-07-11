/** Edge-safe provider HTTP and API response helpers. */

import {
  ValidationError,
  isAllowedReplicateUrl,
  type ImageCount,
  type ImageQuality,
  type OutputSize,
} from "./generation";
import { AccessControlError } from "./access";

const REPLICATE_ORIGIN = "https://api.replicate.com";
const OPENAI_IMAGE_EDIT_URL = "https://api.openai.com/v1/images/edits";
const MAX_RETRY_AFTER_MS = 5_000;
const DEFAULT_RETRY_AFTER_MS = 1_000;
const MAX_RECOMMENDED_DATA_URL_BYTES = 256 * 1024;

export type FetchImplementation = typeof fetch;

export type ProviderRequestOptions = {
  readonly token: string;
  readonly fetchImpl?: FetchImplementation;
  readonly sleep?: (milliseconds: number) => Promise<void>;
};

export type ReplicatePrediction = {
  readonly id?: unknown;
  readonly status?: unknown;
  readonly output?: unknown;
};

export type NormalizedPredictionStatus =
  | "starting"
  | "processing"
  | "succeeded"
  | "failed"
  | "canceled"
  | "aborted";

export type NormalizedPrediction = {
  readonly id: string;
  readonly status: NormalizedPredictionStatus;
  readonly terminal: boolean;
  readonly outputs: string[];
  readonly error?: string;
  readonly code?: string;
};

export class ProviderApiError extends Error {
  constructor(
    readonly provider: "openai" | "replicate",
    readonly status: number,
    readonly code: string,
    readonly safeMessage: string,
    readonly requestId?: string,
  ) {
    super(safeMessage);
    this.name = "ProviderApiError";
  }
}

function sleepWithTimer(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function safeRequestId(headers: Headers): string | undefined {
  const value =
    headers.get("x-request-id") ??
    headers.get("x-replicate-request-id") ??
    headers.get("cf-ray") ??
    undefined;
  if (!value || !/^[A-Za-z0-9._:-]{1,128}$/.test(value)) return undefined;
  return value;
}

function providerError(
  provider: "openai" | "replicate",
  status: number,
  requestId?: string,
): ProviderApiError {
  const label = provider === "openai" ? "OpenAI" : "Replicate";

  if (status === 401 || status === 403) {
    return new ProviderApiError(
      provider,
      status,
      "PROVIDER_AUTH_ERROR",
      `${label} 연결 설정을 확인해주세요.`,
      requestId,
    );
  }
  if (status === 402) {
    return new ProviderApiError(
      provider,
      status,
      "INSUFFICIENT_CREDITS",
      `${label} 크레딧이 부족합니다.`,
      requestId,
    );
  }
  if (status === 404) {
    return new ProviderApiError(
      provider,
      status,
      "PREDICTION_NOT_FOUND",
      "요청한 생성 작업을 찾을 수 없습니다.",
      requestId,
    );
  }
  if (status === 429) {
    return new ProviderApiError(
      provider,
      status,
      "RATE_LIMITED",
      "요청이 많습니다. 잠시 후 다시 시도해주세요.",
      requestId,
    );
  }
  if (status === 400 || status === 413 || status === 422) {
    return new ProviderApiError(
      provider,
      status,
      "PROVIDER_REQUEST_REJECTED",
      `${label}가 이 생성 요청을 처리하지 못했습니다. 설정을 조금 바꿔 다시 시도해주세요.`,
      requestId,
    );
  }
  if (status >= 500) {
    return new ProviderApiError(
      provider,
      status,
      "PROVIDER_UNAVAILABLE",
      `${label} 서비스가 일시적으로 불안정합니다. 잠시 후 다시 시도해주세요.`,
      requestId,
    );
  }
  return new ProviderApiError(
    provider,
    status,
    "PROVIDER_REQUEST_FAILED",
    `${label} 요청을 완료하지 못했습니다.`,
    requestId,
  );
}

function configurationError(provider: "openai" | "replicate"): ProviderApiError {
  const label = provider === "openai" ? "OpenAI" : "Replicate";
  return new ProviderApiError(
    provider,
    500,
    "SERVER_CONFIG_ERROR",
    `${label} 연결 설정이 준비되지 않았습니다.`,
  );
}

export function requireOpenAIKey(env: Record<string, string | undefined> = process.env): string {
  const token = env.OPENAI_API_KEY?.trim();
  if (!token) throw configurationError("openai");
  return token;
}

export function requireReplicateToken(env: Record<string, string | undefined> = process.env): string {
  const token = env.REPLICATE_API_KEY?.trim() || env.REPLICATE_API_TOKEN?.trim();
  if (!token) throw configurationError("replicate");
  return token;
}

export function parseRetryAfterMs(value: string | null, now = Date.now()): number {
  if (!value) return DEFAULT_RETRY_AFTER_MS;
  const seconds = Number(value);
  const rawMilliseconds = Number.isFinite(seconds)
    ? seconds * 1_000
    : Date.parse(value) - now;
  if (!Number.isFinite(rawMilliseconds) || rawMilliseconds <= 0) {
    return DEFAULT_RETRY_AFTER_MS;
  }
  return Math.min(Math.ceil(rawMilliseconds), MAX_RETRY_AFTER_MS);
}

function assertReplicatePath(path: string): void {
  if (!/^\/v1\/[a-z0-9_./-]+$/.test(path) || path.includes("..")) {
    throw new Error("Unsafe Replicate API path");
  }
}

export async function replicateJsonRequest<T>(
  path: string,
  request: {
    readonly method: "GET" | "POST";
    readonly body?: unknown;
    readonly cancelAfter?: `${number}s` | `${number}m`;
  },
  options: ProviderRequestOptions,
): Promise<{ data: T; requestId?: string }> {
  assertReplicatePath(path);
  if (!options.token.trim()) throw configurationError("replicate");
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? sleepWithTimer;
  const serializedBody = request.body === undefined ? undefined : JSON.stringify(request.body);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let response: Response;
    try {
      response = await fetchImpl(`${REPLICATE_ORIGIN}${path}`, {
        method: request.method,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${options.token}`,
          ...(serializedBody === undefined ? {} : { "Content-Type": "application/json" }),
          ...(request.cancelAfter ? { "Cancel-After": request.cancelAfter } : {}),
        },
        body: serializedBody,
      });
    } catch {
      throw new ProviderApiError(
        "replicate",
        503,
        "PROVIDER_UNAVAILABLE",
        "Replicate 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.",
      );
    }
    const requestId = safeRequestId(response.headers);

    if (response.status === 429 && attempt === 0) {
      await sleep(parseRetryAfterMs(response.headers.get("Retry-After")));
      continue;
    }
    if (!response.ok) {
      // Deliberately do not parse or echo the provider response body. It can
      // contain implementation detail and is not a stable client contract.
      throw providerError("replicate", response.status, requestId);
    }

    try {
      const data = (await response.json()) as T;
      return { data, requestId };
    } catch {
      throw new ProviderApiError(
        "replicate",
        502,
        "PROVIDER_RESPONSE_INVALID",
        "Replicate 응답을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.",
        requestId,
      );
    }
  }

  throw new Error("Unreachable retry state");
}

export async function fileToDataUrl(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let base64 = "";
  // 24,576 is divisible by three, so separately encoded chunks can be joined
  // without introducing padding between chunks. This avoids Node Buffer and a
  // giant argument list while remaining Cloudflare Workers compatible.
  const chunkSize = 24_576;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
    let binary = "";
    for (let index = 0; index < chunk.length; index += 1) {
      binary += String.fromCharCode(chunk[index]);
    }
    base64 += btoa(binary);
  }
  return `data:${file.type};base64,${base64}`;
}

type ReplicateFileResponse = {
  readonly urls?: { readonly get?: unknown };
};

function validateReplicateFileUrl(value: unknown, requestId?: string): string {
  if (typeof value === "string") {
    try {
      const url = new URL(value);
      if (
        url.origin === REPLICATE_ORIGIN &&
        /^\/v1\/files\/[A-Za-z0-9_-]+$/.test(url.pathname) &&
        url.search === "" &&
        url.hash === ""
      ) {
        return url.href;
      }
    } catch {
      // Fall through to a provider-safe error.
    }
  }
  throw new ProviderApiError(
    "replicate",
    502,
    "PROVIDER_RESPONSE_INVALID",
    "Replicate 파일 업로드 응답을 확인하지 못했습니다.",
    requestId,
  );
}

/**
 * Replicate recommends data URLs only for small files. Larger accepted uploads
 * go through its authenticated Files API and the opaque returned URL is reused
 * across independent predictions.
 */
export async function prepareReplicateFileInput(
  file: File,
  options: ProviderRequestOptions,
): Promise<{ url: string; requestId?: string }> {
  if (file.size <= MAX_RECOMMENDED_DATA_URL_BYTES) {
    return { url: await fileToDataUrl(file) };
  }
  if (!options.token.trim()) throw configurationError("replicate");

  const body = new FormData();
  body.set("content", file, file.name || "source-image");
  body.set("metadata", new Blob(["{}"], { type: "application/json" }));
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? sleepWithTimer;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let response: Response;
    try {
      response = await fetchImpl(`${REPLICATE_ORIGIN}/v1/files`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${options.token}`,
        },
        body,
      });
    } catch {
      throw new ProviderApiError(
        "replicate",
        503,
        "PROVIDER_UNAVAILABLE",
        "Replicate 파일 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.",
      );
    }
    const requestId = safeRequestId(response.headers);
    if (response.status === 429 && attempt === 0) {
      await sleep(parseRetryAfterMs(response.headers.get("Retry-After")));
      continue;
    }
    if (!response.ok) throw providerError("replicate", response.status, requestId);

    let payload: ReplicateFileResponse;
    try {
      payload = (await response.json()) as ReplicateFileResponse;
    } catch {
      throw new ProviderApiError(
        "replicate",
        502,
        "PROVIDER_RESPONSE_INVALID",
        "Replicate 파일 업로드 응답을 확인하지 못했습니다.",
        requestId,
      );
    }
    return { url: validateReplicateFileUrl(payload.urls?.get, requestId), requestId };
  }

  throw new Error("Unreachable upload retry state");
}

type OpenAIImageEditInput = {
  readonly image: File;
  readonly prompt: string;
  readonly count: ImageCount;
  readonly quality: ImageQuality;
  readonly outputSize: OutputSize;
};

type OpenAIImageResponse = {
  readonly data?: Array<{ readonly b64_json?: unknown }>;
};

export async function requestOpenAIImageEdit(
  input: OpenAIImageEditInput,
  options: { readonly apiKey: string; readonly fetchImpl?: FetchImplementation },
): Promise<{ images: string[]; requestId?: string }> {
  if (!options.apiKey.trim()) throw configurationError("openai");
  const body = new FormData();
  body.set("model", "gpt-image-2");
  body.set("image", input.image, input.image.name || "source-image");
  body.set("prompt", input.prompt);
  body.set("n", String(Math.min(input.count, 4)));
  body.set("size", input.outputSize.size);
  body.set("quality", input.quality || "medium");
  body.set("output_format", "webp");
  body.set("output_compression", "90");
  body.set("background", "opaque");
  // gpt-image-2 always uses high-fidelity image inputs. `input_fidelity` is
  // unsupported and intentionally absent from this request.

  let response: Response;
  try {
    response = await (options.fetchImpl ?? fetch)(OPENAI_IMAGE_EDIT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        Accept: "application/json",
      },
      body,
    });
  } catch {
    throw new ProviderApiError(
      "openai",
      503,
      "PROVIDER_UNAVAILABLE",
      "OpenAI 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.",
    );
  }
  const requestId = safeRequestId(response.headers);
  if (!response.ok) {
    throw providerError("openai", response.status, requestId);
  }

  let payload: OpenAIImageResponse;
  try {
    payload = (await response.json()) as OpenAIImageResponse;
  } catch {
    throw new ProviderApiError(
      "openai",
      502,
      "PROVIDER_RESPONSE_INVALID",
      "OpenAI 이미지 응답을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.",
      requestId,
    );
  }

  const images = (payload.data ?? []).flatMap((item) => {
    if (typeof item.b64_json !== "string" || item.b64_json.length === 0) return [];
    return [`data:image/webp;base64,${item.b64_json.replace(/\s+/g, "")}`];
  });
  if (images.length === 0) {
    throw new ProviderApiError(
      "openai",
      502,
      "PROVIDER_OUTPUT_EMPTY",
      "OpenAI가 완성된 이미지를 반환하지 않았습니다. 다시 시도해주세요.",
      requestId,
    );
  }
  return { images: images.slice(0, input.count), requestId };
}

export function isValidPredictionId(value: string): boolean {
  return /^[a-z0-9]{8,64}$/.test(value);
}

export function normalizeReplicateOutputs(output: unknown): string[] {
  const results: string[] = [];
  const seen = new Set<string>();

  const visit = (value: unknown, depth: number) => {
    if (depth > 5 || value === null || value === undefined) return;
    if (typeof value === "string") {
      if (!isAllowedReplicateUrl(value)) return;
      const url = new URL(value);
      if (!seen.has(url.href)) {
        seen.add(url.href);
        results.push(url.href);
      }
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) visit(item, depth + 1);
      return;
    }
    if (typeof value === "object") {
      const possibleUrl = (value as { url?: unknown }).url;
      if (possibleUrl !== undefined) visit(possibleUrl, depth + 1);
    }
  };

  visit(output, 0);
  return results;
}

function normalizedStatus(value: unknown): NormalizedPredictionStatus {
  switch (value) {
    case "starting":
    case "queued":
      return "starting";
    case "processing":
      return "processing";
    case "succeeded":
      return "succeeded";
    case "failed":
      return "failed";
    case "canceled":
    case "cancelled":
      return "canceled";
    case "aborted":
      return "aborted";
    default:
      return "starting";
  }
}

export function normalizePrediction(prediction: ReplicatePrediction): NormalizedPrediction {
  const id = typeof prediction.id === "string" ? prediction.id : "";
  const status = normalizedStatus(prediction.status);
  const terminal =
    status === "succeeded" ||
    status === "failed" ||
    status === "canceled" ||
    status === "aborted";
  const base = {
    id,
    status,
    terminal,
    outputs: normalizeReplicateOutputs(prediction.output),
  };

  if (status === "failed") {
    return { ...base, error: "생성 작업을 완료하지 못했습니다.", code: "PREDICTION_FAILED" };
  }
  if (status === "canceled") {
    return { ...base, error: "생성 작업이 취소되었습니다.", code: "PREDICTION_CANCELED" };
  }
  if (status === "aborted") {
    return { ...base, error: "생성 작업이 중단되었습니다.", code: "PREDICTION_ABORTED" };
  }
  return base;
}

function clientHttpStatus(error: ProviderApiError): number {
  if (error.status === 402 || error.status === 404 || error.status === 429) return error.status;
  if (error.code === "SERVER_CONFIG_ERROR") return 500;
  return 502;
}

export function apiErrorResponse(
  error: unknown,
  fallbackMessage = "요청을 처리하는 중 문제가 발생했습니다.",
): Response {
  if (error instanceof AccessControlError) {
    return Response.json(
      { error: error.safeMessage, code: error.code },
      {
        status: error.status,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
  if (error instanceof ValidationError) {
    return Response.json(
      { error: error.safeMessage, code: error.code },
      { status: error.status },
    );
  }
  if (error instanceof ProviderApiError) {
    return Response.json(
      {
        error: error.safeMessage,
        code: error.code,
        ...(error.requestId ? { requestId: error.requestId } : {}),
      },
      { status: clientHttpStatus(error) },
    );
  }
  return Response.json(
    { error: fallbackMessage, code: "INTERNAL_ERROR" },
    { status: 500 },
  );
}
