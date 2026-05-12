import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Replicate SDK는 CommonJS default export 형태 (`import Replicate from 'replicate'`)
// vi.mock의 factory는 반드시 { default: ... } shape를 반환해야 한다.
// 새 wrapper는 client.run() 대신 client.predictions.create + client.predictions.get
// 폴링 패턴을 사용한다 (Cloudflare edge 호환성).
const mockCreate = vi.fn();
const mockGet = vi.fn();
const mockConstructor = vi.fn().mockImplementation(() => ({
  predictions: {
    create: mockCreate,
    get: mockGet,
  },
}));

vi.mock("replicate", () => ({
  default: mockConstructor,
}));

const SAMPLE_IMAGE =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQ==";

type Prediction = {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: unknown;
  error?: string | null;
};

function makePrediction(p: Partial<Prediction> & Pick<Prediction, "status">): Prediction {
  return { id: "pred_test_1", error: null, ...p };
}

describe("lib/replicate — predictions.create + polling wrapper", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockGet.mockReset();
    mockConstructor.mockClear();
    vi.resetModules();
    vi.stubEnv("REPLICATE_API_TOKEN", "r8_test_dummy_token_for_unit_test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws when REPLICATE_API_TOKEN is missing", async () => {
    vi.stubEnv("REPLICATE_API_TOKEN", "");
    const mod = await import("@/lib/replicate");
    await expect(
      mod.generateStyledImage({ image: SAMPLE_IMAGE, styleId: "id_photo_basic" })
    ).rejects.toThrow();
  });

  it("calls predictions.create with the expected model and input shape", async () => {
    mockCreate.mockResolvedValueOnce(
      makePrediction({ status: "succeeded", output: ["https://replicate.delivery/example/out.webp"] })
    );

    const mod = await import("@/lib/replicate");
    const result = await mod.generateStyledImage({
      image: SAMPLE_IMAGE,
      styleId: "id_photo_basic",
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const opts = mockCreate.mock.calls[0][0];
    expect(opts.model).toBe("openai/gpt-image-2");
    expect(opts.input).toBeDefined();
    expect(typeof opts.input.prompt).toBe("string");
    expect(opts.input.prompt.length).toBeGreaterThan(10);
    expect(opts.input.input_images).toEqual([SAMPLE_IMAGE]);
    expect(opts.input.number_of_images).toBe(1);
    expect(opts.input.output_format).toBe("webp");
    expect(opts.input.output_compression).toBe(90);
    expect(opts.input.quality).toBe("auto");
    expect(opts.input.moderation).toBe("auto");
    expect(typeof opts.input.aspect_ratio).toBe("string");

    expect(result).toEqual({ imageUrl: "https://replicate.delivery/example/out.webp" });
  });

  it("returns the first URL when prediction.output is string[]", async () => {
    mockCreate.mockResolvedValueOnce(
      makePrediction({
        status: "succeeded",
        output: [
          "https://replicate.delivery/example/first.webp",
          "https://replicate.delivery/example/second.webp",
        ],
      })
    );
    const mod = await import("@/lib/replicate");
    const result = await mod.generateStyledImage({
      image: SAMPLE_IMAGE,
      styleId: "id_photo_basic",
    });
    expect(result.imageUrl).toBe("https://replicate.delivery/example/first.webp");
  });

  it("returns the URL when prediction.output is a plain string", async () => {
    mockCreate.mockResolvedValueOnce(
      makePrediction({ status: "succeeded", output: "https://replicate.delivery/example/single.webp" })
    );
    const mod = await import("@/lib/replicate");
    const result = await mod.generateStyledImage({
      image: SAMPLE_IMAGE,
      styleId: "id_photo_basic",
    });
    expect(result.imageUrl).toBe("https://replicate.delivery/example/single.webp");
  });

  it("throws when styleId is not a known style", async () => {
    const mod = await import("@/lib/replicate");
    await expect(
      mod.generateStyledImage({ image: SAMPLE_IMAGE, styleId: "no_such_style" })
    ).rejects.toThrow();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("throws when prediction.output is an empty array", async () => {
    mockCreate.mockResolvedValueOnce(makePrediction({ status: "succeeded", output: [] }));
    const mod = await import("@/lib/replicate");
    await expect(
      mod.generateStyledImage({ image: SAMPLE_IMAGE, styleId: "id_photo_basic" })
    ).rejects.toThrow();
  });

  it("propagates Replicate SDK errors from predictions.create", async () => {
    mockCreate.mockRejectedValueOnce(new Error("upstream 422"));
    const mod = await import("@/lib/replicate");
    await expect(
      mod.generateStyledImage({ image: SAMPLE_IMAGE, styleId: "id_photo_basic" })
    ).rejects.toThrow(/upstream 422/);
  });

  it("uses aspect_ratio from style metadata when defined (e.g. 2:3 for passport)", async () => {
    mockCreate.mockResolvedValueOnce(
      makePrediction({ status: "succeeded", output: ["https://replicate.delivery/example/passport.webp"] })
    );
    const mod = await import("@/lib/replicate");
    await mod.generateStyledImage({ image: SAMPLE_IMAGE, styleId: "passport" });
    const opts = mockCreate.mock.calls[0][0];
    expect(opts.input.aspect_ratio).toBe("2:3");
  });

  // -- Polling 케이스 ----------------------------------------------------

  it("polls predictions.get until status is succeeded", async () => {
    mockCreate.mockResolvedValueOnce(makePrediction({ status: "starting" }));
    mockGet.mockResolvedValueOnce(makePrediction({ status: "processing" }));
    mockGet.mockResolvedValueOnce(
      makePrediction({ status: "succeeded", output: ["https://replicate.delivery/poll/ok.webp"] })
    );

    const mod = await import("@/lib/replicate");
    const result = await mod.generateStyledImage({
      image: SAMPLE_IMAGE,
      styleId: "id_photo_basic",
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(mockGet.mock.calls[0][0]).toBe("pred_test_1");
    expect(result.imageUrl).toBe("https://replicate.delivery/poll/ok.webp");
  });

  it("throws when polling reaches a failed prediction", async () => {
    mockCreate.mockResolvedValueOnce(makePrediction({ status: "processing" }));
    mockGet.mockResolvedValueOnce(
      makePrediction({ status: "failed", error: "moderation_rejected" })
    );

    const mod = await import("@/lib/replicate");
    await expect(
      mod.generateStyledImage({ image: SAMPLE_IMAGE, styleId: "id_photo_basic" })
    ).rejects.toThrow(/failed/);
  });

  it("throws when polling reaches a canceled prediction", async () => {
    mockCreate.mockResolvedValueOnce(makePrediction({ status: "processing" }));
    mockGet.mockResolvedValueOnce(makePrediction({ status: "canceled" }));

    const mod = await import("@/lib/replicate");
    await expect(
      mod.generateStyledImage({ image: SAMPLE_IMAGE, styleId: "id_photo_basic" })
    ).rejects.toThrow(/canceled/);
  });

  // -- FileOutput shape 회귀 ---------------------------------------------

  it("extracts URL from prediction.output of FileOutput[] (.url returns URL)", async () => {
    const fake = { url() { return new URL("https://replicate.delivery/abc/result.webp"); } };
    mockCreate.mockResolvedValueOnce(makePrediction({ status: "succeeded", output: [fake] }));
    const mod = await import("@/lib/replicate");
    const result = await mod.generateStyledImage({
      image: SAMPLE_IMAGE,
      styleId: "id_photo_basic",
    });
    expect(result.imageUrl).toBe("https://replicate.delivery/abc/result.webp");
  });

  it("extracts URL from prediction.output of FileOutput[] (.url returns string)", async () => {
    const fake = { url() { return "https://replicate.delivery/def/result.webp"; } };
    mockCreate.mockResolvedValueOnce(makePrediction({ status: "succeeded", output: [fake] }));
    const mod = await import("@/lib/replicate");
    const result = await mod.generateStyledImage({
      image: SAMPLE_IMAGE,
      styleId: "id_photo_basic",
    });
    expect(result.imageUrl).toBe("https://replicate.delivery/def/result.webp");
  });

  it("extracts URL from a single FileOutput-like object (no array wrapper)", async () => {
    const fake = { url() { return new URL("https://replicate.delivery/ghi/single.webp"); } };
    mockCreate.mockResolvedValueOnce(makePrediction({ status: "succeeded", output: fake }));
    const mod = await import("@/lib/replicate");
    const result = await mod.generateStyledImage({
      image: SAMPLE_IMAGE,
      styleId: "id_photo_basic",
    });
    expect(result.imageUrl).toBe("https://replicate.delivery/ghi/single.webp");
  });

  it("extracts URL from a plain object with `url: string` property", async () => {
    mockCreate.mockResolvedValueOnce(
      makePrediction({ status: "succeeded", output: [{ url: "https://replicate.delivery/jkl/plain.webp" }] })
    );
    const mod = await import("@/lib/replicate");
    const result = await mod.generateStyledImage({
      image: SAMPLE_IMAGE,
      styleId: "id_photo_basic",
    });
    expect(result.imageUrl).toBe("https://replicate.delivery/jkl/plain.webp");
  });
});
