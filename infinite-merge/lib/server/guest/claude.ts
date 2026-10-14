import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { GUEST_MODEL, guestConfig } from "../config";
import { AppError } from "../errors";
import { ALCHEMY_INSTRUCTIONS, buildAlchemyInput } from "../alchemy/prompt";

const ALCHEMY_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    emoji: { type: "string" },
    desc: { type: "string" },
  },
  required: ["name", "emoji", "desc"],
  additionalProperties: false,
};

let client: { key: string; sdk: Anthropic } | undefined;

function getClient(): Anthropic {
  const { enabled, apiKey } = guestConfig();
  if (!enabled || !apiKey) throw new AppError("guest_unavailable", { detail: "guest mode disabled or no ANTHROPIC_API_KEY" });
  if (client?.key !== apiKey) {
    // SDK retries 408/409/429/5xx (incl. 529 overloaded) with backoff; the timeout bounds the wait.
    client = { key: apiKey, sdk: new Anthropic({ apiKey, maxRetries: 2, timeout: 15_000 }) };
  }
  return client.sdk;
}

export function extractAlchemyText(message: Anthropic.Message): string {
  if (message.stop_reason === "refusal") {
    throw new AppError("bad_output", { message: "이 조합은 연성할 수 없었어요. 다른 조합을 시도해 보세요.", detail: "refusal" });
  }
  if (message.stop_reason === "max_tokens") throw new AppError("bad_output", { detail: "max_tokens" });
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

export function claudeErrorToAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    return new AppError("guest_unavailable", { detail: `anthropic ${err.status}` });
  }
  // Exhausted credits surface as a 400; so would a bug in this request. Either way guests can't play on.
  if (err instanceof Anthropic.BadRequestError) return new AppError("guest_unavailable", { detail: "anthropic 400" });
  if (err instanceof Anthropic.RateLimitError) return new AppError("unavailable", { detail: "anthropic 429" });
  if (err instanceof Anthropic.APIConnectionError) return new AppError("unavailable", { detail: "anthropic connection" });
  if (err instanceof Anthropic.APIError) return new AppError("unavailable", { detail: `anthropic ${err.status}` });
  return new AppError("internal", { detail: String(err) });
}

/** One alchemy step on the operator's key. Returns raw model text for the shared parser. */
export async function claudeAlchemy(a: string, b: string): Promise<string> {
  try {
    const message = await getClient().messages.create({
      model: GUEST_MODEL,
      // Room for adaptive thinking plus a one-line JSON answer.
      max_tokens: 1024,
      system: ALCHEMY_INSTRUCTIONS,
      output_config: { effort: "low", format: { type: "json_schema", schema: ALCHEMY_SCHEMA } },
      messages: [{ role: "user", content: buildAlchemyInput(a, b) }],
    });
    // Operator-side cost trail: token counts per call, matchable in the Console by request_id.
    console.log(
      `[guest] claude ok ${a}+${b} in=${message.usage.input_tokens} out=${message.usage.output_tokens} request_id=${message._request_id ?? "-"}`,
    );
    return extractAlchemyText(message);
  } catch (err) {
    const appErr = claudeErrorToAppError(err);
    const requestId = err instanceof Anthropic.APIError ? err.requestID : undefined;
    console.warn(`[guest] claude call failed: ${appErr.code} (${appErr.detail ?? "-"}) request_id=${requestId ?? "-"}`);
    if (err instanceof Anthropic.AuthenticationError) console.warn("[guest] check ANTHROPIC_API_KEY in .env.local");
    throw appErr;
  }
}
