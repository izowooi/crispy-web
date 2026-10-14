import "server-only";
import { AppError } from "../errors";
import { SIWC } from "../config";

export type ModelInfo = { slug: string; displayName: string };

const MODELS_TTL_MS = 10 * 60 * 1000;
const modelsCache = new Map<string, { at: number; models: ModelInfo[] }>();

export async function listModels(cacheKey: string, accessToken: string): Promise<ModelInfo[]> {
  const cached = modelsCache.get(cacheKey);
  if (cached && Date.now() - cached.at < MODELS_TTL_MS) return cached.models;
  const res = await fetch(`${SIWC.apiBase}/models`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw await httpError(res);
  const body = (await res.json()) as {
    models?: { slug: string; display_name?: string; visibility?: string }[];
  };
  const models = (body.models ?? [])
    .filter((m) => m.visibility === "list")
    .map((m) => ({ slug: m.slug, displayName: m.display_name || m.slug }));
  modelsCache.set(cacheKey, { at: Date.now(), models });
  return models;
}

export function forgetModels(cacheKey: string): void {
  modelsCache.delete(cacheKey);
}

/**
 * Small, fast models make the merge feel instant and spend far less of the user's plan;
 * naming two words doesn't need a frontier model. GPT-6 Luna is the efficient tier.
 */
export function pickDefaultModel(models: ModelInfo[]): string | null {
  return models.find((m) => /luna|mini|nano|flash|spark|lite/i.test(m.slug))?.slug ?? models[0]?.slug ?? null;
}

// ── Error mapping (docs: Errors and recovery) ────────────────────────────────

export function mapApiError(status: number, code: string | null, detail?: string, retryAfterMs?: number): AppError {
  const opts = { detail: [code, detail].filter(Boolean).join(": ") || undefined, retryAfterMs };
  switch (code) {
    case "subscription_sharing_usage_limit_exceeded":
      return new AppError("usage_limit", opts);
    // Generic platform overload codes; server_is_overloaded was observed live as a mid-stream `error` event.
    case "server_is_overloaded":
    case "server_error":
    case "service_unavailable":
    case "subscription_sharing_usage_unavailable":
    case "subscription_sharing_user_unavailable":
      return new AppError("unavailable", opts);
    case "subscription_sharing_user_not_eligible":
      return new AppError("not_eligible", opts);
    case "subscription_sharing_invalid_user":
      return new AppError("session_expired", opts);
    case "subscription_sharing_unsupported_capability":
      return new AppError("unsupported", opts);
    case "subscription_sharing_route_not_supported":
    case "chatpass_v2_scope_not_authorized":
    case "chatpass_v2_invalid_authorization_context":
      return new AppError("internal", { ...opts, message: "이 앱은 해당 작업 권한이 없어요. 앱 설정을 확인해 주세요." });
  }
  if (status === 401) return new AppError("session_expired", opts);
  if (status === 403) return new AppError("not_eligible", opts);
  if (status === 429) return new AppError("usage_limit", opts);
  if (status >= 500 && status <= 599) return new AppError("unavailable", opts);
  if (status === 400) return new AppError("unsupported", opts);
  return new AppError("internal", opts);
}

async function httpError(res: Response): Promise<AppError & { param?: string }> {
  const requestId = res.headers.get("x-request-id");
  let code: string | null = null;
  let message: string | undefined;
  let param: string | undefined;
  try {
    const body = (await res.json()) as {
      error?: { code?: string; message?: string; param?: string } | string;
      detail?: string;
    };
    if (body.error && typeof body.error === "object") {
      code = body.error.code ?? null;
      message = body.error.message;
      param = body.error.param;
    } else if (typeof body.detail === "string") {
      message = body.detail;
    }
  } catch {
    // body was not JSON
  }
  console.warn(`[siwc] api error status=${res.status} code=${code ?? "-"} param=${param ?? "-"} request_id=${requestId ?? "-"}`);
  const err = mapApiError(res.status, code, message, parseRetryAfter(res.headers.get("retry-after"))) as AppError & {
    param?: string;
  };
  err.param = param;
  return err;
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const at = Date.parse(value);
  return Number.isNaN(at) ? undefined : Math.max(0, at - Date.now());
}

// ── SSE stream ───────────────────────────────────────────────────────────────

export type StreamResult = { text: string; responseId: string | null };

/** Parses a Responses API SSE body. Success only on response.completed (docs: models-and-inference §3). */
export async function readResponseStream(body: ReadableStream<Uint8Array>): Promise<StreamResult> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let responseId: string | null = null;

  const handle = (data: string): StreamResult | null => {
    if (data === "[DONE]") return null;
    let event: {
      type?: string;
      delta?: string;
      response?: { id?: string; error?: { code?: string; message?: string }; incomplete_details?: { reason?: string } };
      error?: { code?: string; message?: string };
      code?: string;
      message?: string;
    };
    try {
      event = JSON.parse(data);
    } catch {
      return null;
    }
    switch (event.type) {
      case "response.created":
        responseId = event.response?.id ?? responseId;
        return null;
      case "response.output_text.delta":
        text += event.delta ?? "";
        return null;
      case "response.completed":
        return { text, responseId: event.response?.id ?? responseId };
      case "response.failed": {
        const e = event.response?.error;
        console.warn(`[siwc] response.failed code=${e?.code ?? "-"} response_id=${responseId ?? "-"}`);
        throw mapApiError(200, e?.code ?? null, e?.message);
      }
      case "response.incomplete":
        throw new AppError("bad_output", { detail: `incomplete: ${event.response?.incomplete_details?.reason ?? "unknown"}` });
      case "error": {
        const code = event.error?.code ?? event.code ?? null;
        console.warn(`[siwc] stream error event code=${code ?? "-"}`);
        throw mapApiError(200, code, event.error?.message ?? event.message);
      }
      default:
        return null;
    }
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      // SSE events are separated by a blank line; tolerate CRLF.
      buffer = buffer.replace(/\r\n/g, "\n");
      let idx: number;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        const raw = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const data = raw
          .split("\n")
          .filter((l) => l.startsWith("data:"))
          .map((l) => l.slice(5).trimStart())
          .join("\n");
        if (!data) continue;
        const result = handle(data);
        if (result) return result;
      }
      if (done) break;
    }
  } finally {
    reader.cancel().catch(() => {});
  }
  throw new AppError("unavailable", { message: "응답이 중간에 끊겼어요. 다시 시도해 주세요.", detail: "stream ended before response.completed" });
}

const noReasoningModels = new Set<string>();

export type StreamRequest = {
  accessToken: string;
  model: string;
  instructions: string;
  input: string;
  reasoningEffort?: "low" | "medium" | "high";
};

export async function streamResponse(req: StreamRequest): Promise<StreamResult> {
  const useReasoning = Boolean(req.reasoningEffort) && !noReasoningModels.has(req.model);
  try {
    return await postResponses(req, useReasoning);
  } catch (err) {
    // The only optional field we send is `reasoning`, so a 400 unsupported_capability points at it.
    if (useReasoning && err instanceof AppError && err.code === "unsupported") {
      noReasoningModels.add(req.model);
      return postResponses(req, false);
    }
    throw err;
  }
}

async function postResponses(req: StreamRequest, withReasoning: boolean): Promise<StreamResult> {
  // Only fields the plan-usage route accepts; temperature/max_output_tokens/metadata/user etc. are rejected.
  const body: Record<string, unknown> = {
    model: req.model,
    instructions: req.instructions,
    input: [{ role: "user", content: req.input }],
    store: false,
    stream: true,
  };
  if (withReasoning) body.reasoning = { effort: req.reasoningEffort };

  const res = await fetch(`${SIWC.apiBase}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${req.accessToken}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) throw await httpError(res);
  return readResponseStream(res.body);
}
