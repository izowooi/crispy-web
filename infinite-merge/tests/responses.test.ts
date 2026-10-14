import { afterEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/server/errors";
import { mapApiError, pickDefaultModel, readResponseStream, streamResponse } from "@/lib/server/siwc/responses";

function sse(events: unknown[], { cut = false, crlf = false } = {}): ReadableStream<Uint8Array> {
  const nl = crlf ? "\r\n" : "\n";
  let text = events.map((e) => `event: x${nl}data: ${JSON.stringify(e)}${nl}${nl}`).join("");
  if (cut) text = text.slice(0, -5);
  const bytes = new TextEncoder().encode(text);
  // Deliver in awkward 7-byte chunks to exercise buffering across boundaries (incl. multibyte Korean).
  return new ReadableStream({
    start(controller) {
      for (let i = 0; i < bytes.length; i += 7) controller.enqueue(bytes.slice(i, i + 7));
      controller.close();
    },
  });
}

describe("readResponseStream", () => {
  it("accumulates deltas and resolves on response.completed", async () => {
    const result = await readResponseStream(
      sse([
        { type: "response.created", response: { id: "resp_1" } },
        { type: "response.output_text.delta", delta: '{"name":"증' },
        { type: "response.output_text.delta", delta: '기","emoji":"♨️"}' },
        { type: "response.completed", response: { id: "resp_1" } },
      ]),
    );
    expect(result.text).toBe('{"name":"증기","emoji":"♨️"}');
    expect(result.responseId).toBe("resp_1");
  });

  it("handles CRLF framing", async () => {
    const result = await readResponseStream(
      sse([{ type: "response.output_text.delta", delta: "hi" }, { type: "response.completed", response: {} }], { crlf: true }),
    );
    expect(result.text).toBe("hi");
  });

  it("maps response.failed usage limit to usage_limit", async () => {
    await expect(
      readResponseStream(
        sse([
          { type: "response.output_text.delta", delta: "partial" },
          { type: "response.failed", response: { error: { code: "subscription_sharing_usage_limit_exceeded", message: "limit" } } },
        ]),
      ),
    ).rejects.toMatchObject({ code: "usage_limit", status: 429, action: "manage_usage" });
  });

  it("fails when the stream ends before response.completed", async () => {
    await expect(
      readResponseStream(sse([{ type: "response.output_text.delta", delta: "partial" }, { type: "response.completed" }], { cut: true })),
    ).rejects.toMatchObject({ code: "unavailable" });
  });

  it("treats response.incomplete as bad output", async () => {
    await expect(
      readResponseStream(sse([{ type: "response.incomplete", response: { incomplete_details: { reason: "content_filter" } } }])),
    ).rejects.toMatchObject({ code: "bad_output" });
  });
});

describe("mapApiError", () => {
  it.each([
    [429, "subscription_sharing_usage_limit_exceeded", "usage_limit"],
    [503, "subscription_sharing_usage_unavailable", "unavailable"],
    [503, "subscription_sharing_user_unavailable", "unavailable"],
    [403, "subscription_sharing_user_not_eligible", "not_eligible"],
    [401, "subscription_sharing_invalid_user", "session_expired"],
    [400, "subscription_sharing_unsupported_capability", "unsupported"],
    [403, "subscription_sharing_route_not_supported", "internal"],
    [403, "chatpass_v2_scope_not_authorized", "internal"],
    [401, null, "session_expired"],
    [403, null, "not_eligible"],
    [503, null, "unavailable"],
    // Seen live as a mid-stream `error` event (HTTP 200 already sent).
    [200, "server_is_overloaded", "unavailable"],
    [200, "server_error", "unavailable"],
    [500, null, "unavailable"],
    [418, null, "internal"],
  ] as const)("%i %s → %s", (status, code, expected) => {
    expect(mapApiError(status, code).code).toBe(expected);
  });
});

describe("pickDefaultModel", () => {
  it("prefers a small model, else the first listed", () => {
    expect(pickDefaultModel([{ slug: "gpt-6.1-sol", displayName: "" }, { slug: "gpt-6.1-mini", displayName: "" }])).toBe("gpt-6.1-mini");
    expect(pickDefaultModel([{ slug: "gpt-6.1-sol", displayName: "" }])).toBe("gpt-6.1-sol");
    expect(
      pickDefaultModel([
        { slug: "gpt-6-astra", displayName: "" },
        { slug: "gpt-6.1-sol", displayName: "" },
        { slug: "gpt-6-luna", displayName: "" },
      ]),
    ).toBe("gpt-6-luna");
    expect(pickDefaultModel([])).toBeNull();
  });
});

describe("streamResponse request body", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends store:false, stream:true and no unsupported fields; retries without reasoning when rejected", async () => {
    const bodies: Record<string, unknown>[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        const body = JSON.parse(String(init.body));
        bodies.push(body);
        expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
        if (body.reasoning) {
          return new Response(JSON.stringify({ error: { code: "subscription_sharing_unsupported_capability", param: "reasoning" } }), {
            status: 400,
          });
        }
        return new Response(sse([{ type: "response.output_text.delta", delta: "ok" }, { type: "response.completed", response: {} }]), {
          status: 200,
        });
      }),
    );
    const result = await streamResponse({ accessToken: "tok", model: "m-test", instructions: "i", input: "x", reasoningEffort: "low" });
    expect(result.text).toBe("ok");
    expect(bodies).toHaveLength(2);
    for (const body of bodies) {
      expect(body.store).toBe(false);
      expect(body.stream).toBe(true);
      expect(body.input).toEqual([{ role: "user", content: "x" }]);
      for (const banned of ["temperature", "max_output_tokens", "metadata", "user", "top_p", "previous_response_id"]) {
        expect(body).not.toHaveProperty(banned);
      }
    }
    expect(bodies[1]).not.toHaveProperty("reasoning");

    // Remembered per model: next call skips reasoning entirely.
    bodies.length = 0;
    await streamResponse({ accessToken: "tok", model: "m-test", instructions: "i", input: "x", reasoningEffort: "low" });
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).not.toHaveProperty("reasoning");
  });

  it("surfaces HTTP admission errors as AppError", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ detail: "nope" }), { status: 401 })));
    const err = await streamResponse({ accessToken: "tok", model: "m2", instructions: "i", input: "x" }).catch((e) => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe("session_expired");
  });
});
