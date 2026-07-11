import { describe, expect, it, vi } from "vitest";

import {
  ProviderApiError,
  fileToDataUrl,
  isValidPredictionId,
  normalizePrediction,
  normalizeReplicateOutputs,
  parseRetryAfterMs,
  prepareReplicateFileInput,
  replicateJsonRequest,
  requestOpenAIImageEdit,
  requireReplicateToken,
} from "@/lib/server/api-utils";

describe("prediction utilities", () => {
  it("uses a strict path-safe prediction id", () => {
    expect(isValidPredictionId("wckk6zjh01rmt0cxdt09fmsdzw")).toBe(true);
    expect(isValidPredictionId("abc12345")).toBe(true);
    expect(isValidPredictionId("../../secret")).toBe(false);
    expect(isValidPredictionId("has_UPPERCASE")).toBe(false);
    expect(isValidPredictionId("short")).toBe(false);
  });

  it("normalizes outputs into a deduplicated string array", () => {
    expect(
      normalizeReplicateOutputs([
        "https://replicate.delivery/a.webp",
        ["https://replicate.delivery/b.webp", "https://replicate.delivery/a.webp"],
        { url: "https://replicate.delivery/c.webp" },
        "https://tracking.example/private.webp",
        "provider debug text",
      ]),
    ).toEqual([
      "https://replicate.delivery/a.webp",
      "https://replicate.delivery/b.webp",
      "https://replicate.delivery/c.webp",
    ]);
  });

  it("marks every provider terminal state, including aborted", () => {
    expect(normalizePrediction({ id: "abc12345", status: "starting" })).toMatchObject({
      status: "starting",
      terminal: false,
    });
    expect(normalizePrediction({ id: "abc12345", status: "succeeded", output: "https://replicate.delivery/a" })).toMatchObject({
      status: "succeeded",
      terminal: true,
      outputs: ["https://replicate.delivery/a"],
    });
    expect(normalizePrediction({ id: "abc12345", status: "aborted" })).toMatchObject({
      status: "aborted",
      terminal: true,
      code: "PREDICTION_ABORTED",
    });
  });
});

describe("Replicate HTTP utility", () => {
  it("parses seconds or HTTP dates and bounds Retry-After", () => {
    expect(parseRetryAfterMs("2", 0)).toBe(2_000);
    expect(parseRetryAfterMs("999", 0)).toBe(5_000);
    expect(parseRetryAfterMs(new Date(3_000).toUTCString(), 0)).toBe(3_000);
    expect(parseRetryAfterMs(null, 0)).toBe(1_000);
  });

  it("prefers REPLICATE_API_KEY and supports REPLICATE_API_TOKEN as a fallback", () => {
    expect(requireReplicateToken({ REPLICATE_API_KEY: "key", REPLICATE_API_TOKEN: "token" })).toBe("key");
    expect(requireReplicateToken({ REPLICATE_API_TOKEN: "token" })).toBe("token");
  });

  it("retries a 429 exactly once without exposing the provider response body", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response('{"detail":"secret provider detail"}', {
          status: 429,
          headers: { "Retry-After": "1", "x-request-id": "req-rate-limit" },
        }),
      )
      .mockResolvedValueOnce(
        new Response('{"id":"prediction123","status":"starting"}', {
          status: 201,
          headers: { "content-type": "application/json", "x-request-id": "req-ok" },
        }),
      );
    const sleep = vi.fn(async () => undefined);

    const result = await replicateJsonRequest<{ id: string; status: string }>(
      "/v1/models/example/model/predictions",
      { method: "POST", body: { input: { prompt: "safe" } } },
      { token: "token", fetchImpl, sleep },
    );

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(1_000);
    expect(result.data.id).toBe("prediction123");
    expect(result.requestId).toBe("req-ok");
  });

  it("maps provider errors to a safe typed error", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('{"detail":"raw internal error"}', {
        status: 402,
        headers: { "x-request-id": "req-credit" },
      }),
    );

    await expect(
      replicateJsonRequest("/v1/predictions/abc12345", { method: "GET" }, { token: "token", fetchImpl }),
    ).rejects.toMatchObject({
      status: 402,
      code: "INSUFFICIENT_CREDITS",
      safeMessage: "Replicate 크레딧이 부족합니다.",
      requestId: "req-credit",
    } satisfies Partial<ProviderApiError>);
  });
});

describe("OpenAI image edit utility", () => {
  it("uses only Web APIs to encode an uploaded file", async () => {
    await expect(
      fileToDataUrl(new File(["hello"], "hello.webp", { type: "image/webp" })),
    ).resolves.toBe("data:image/webp;base64,aGVsbG8=");
  });

  it("uploads files larger than the data-URL threshold with raw Web FormData", async () => {
    const file = new File(["source"], "large.webp", { type: "image/webp" });
    Object.defineProperty(file, "size", { value: 300 * 1024 });
    let capturedHeaders: HeadersInit | undefined;
    let capturedBody: FormData | undefined;
    const fetchImpl = vi.fn<typeof fetch>(async (_input, init) => {
      capturedHeaders = init?.headers;
      capturedBody = init?.body as FormData;
      return new Response(
        '{"urls":{"get":"https://api.replicate.com/v1/files/opaque_FILE-123"}}',
        { status: 201, headers: { "content-type": "application/json" } },
      );
    });

    await expect(
      prepareReplicateFileInput(file, { token: "token", fetchImpl }),
    ).resolves.toEqual({
      url: "https://api.replicate.com/v1/files/opaque_FILE-123",
      requestId: undefined,
    });
    expect(capturedBody?.get("content")).toMatchObject({
      name: "large.webp",
      type: "image/webp",
      size: 300 * 1024,
    });
    expect(new Headers(capturedHeaders).has("Content-Type")).toBe(false);
  });

  it("sends the exact gpt-image-2 edit contract without input_fidelity", async () => {
    let capturedBody: FormData | undefined;
    const fetchImpl = vi.fn<typeof fetch>(async (_input, init) => {
      capturedBody = init?.body as FormData;
      return new Response('{"data":[{"b64_json":"aGVsbG8="}]}', {
        status: 200,
        headers: { "content-type": "application/json", "x-request-id": "req-openai" },
      });
    });

    const result = await requestOpenAIImageEdit(
      {
        image: new File(["source"], "source.png", { type: "image/png" }),
        prompt: "locked prompt",
        count: 4,
        quality: "medium",
        outputSize: { width: 1536, height: 864, size: "1536x864" },
      },
      { apiKey: "secret", fetchImpl },
    );

    expect(capturedBody).toBeInstanceOf(FormData);
    expect(capturedBody?.get("model")).toBe("gpt-image-2");
    expect(capturedBody?.get("prompt")).toBe("locked prompt");
    expect(capturedBody?.get("n")).toBe("4");
    expect(capturedBody?.get("size")).toBe("1536x864");
    expect(capturedBody?.get("quality")).toBe("medium");
    expect(capturedBody?.get("output_format")).toBe("webp");
    expect(capturedBody?.get("output_compression")).toBe("90");
    expect(capturedBody?.get("background")).toBe("opaque");
    expect(capturedBody?.has("input_fidelity")).toBe(false);
    expect(result).toEqual({
      images: ["data:image/webp;base64,aGVsbG8="],
      requestId: "req-openai",
    });
  });
});
