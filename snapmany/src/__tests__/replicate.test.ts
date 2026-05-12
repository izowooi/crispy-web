import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Replicate SDK는 CommonJS default export 형태 (`import Replicate from 'replicate'`)
// vi.mock의 factory는 반드시 { default: ... } shape를 반환해야 한다.
const mockRun = vi.fn();
const mockConstructor = vi.fn().mockImplementation(() => ({ run: mockRun }));

vi.mock("replicate", () => ({
  default: mockConstructor,
}));

const SAMPLE_IMAGE =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQ==";

describe("lib/replicate — Replicate SDK wrapper", () => {
  beforeEach(() => {
    mockRun.mockReset();
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

  it("calls Replicate with openai/gpt-image-2 and the expected input shape", async () => {
    mockRun.mockResolvedValueOnce(["https://replicate.delivery/example/out.webp"]);

    const mod = await import("@/lib/replicate");
    const result = await mod.generateStyledImage({
      image: SAMPLE_IMAGE,
      styleId: "id_photo_basic",
    });

    expect(mockRun).toHaveBeenCalledTimes(1);
    const [model, options] = mockRun.mock.calls[0];
    expect(model).toBe("openai/gpt-image-2");
    expect(options).toBeDefined();
    expect(options.input).toBeDefined();
    expect(typeof options.input.prompt).toBe("string");
    expect(options.input.prompt.length).toBeGreaterThan(10);
    expect(options.input.input_images).toEqual([SAMPLE_IMAGE]);
    expect(options.input.number_of_images).toBe(1);
    expect(options.input.output_format).toBe("webp");
    expect(options.input.output_compression).toBe(90);
    expect(options.input.quality).toBe("auto");
    expect(options.input.moderation).toBe("auto");
    // aspect_ratio는 string이어야 한다 (스타일에서 가져오거나 기본 1:1)
    expect(typeof options.input.aspect_ratio).toBe("string");

    expect(result).toEqual({ imageUrl: "https://replicate.delivery/example/out.webp" });
  });

  it("returns the first URL when Replicate responds with string[]", async () => {
    mockRun.mockResolvedValueOnce([
      "https://replicate.delivery/example/first.webp",
      "https://replicate.delivery/example/second.webp",
    ]);
    const mod = await import("@/lib/replicate");
    const result = await mod.generateStyledImage({
      image: SAMPLE_IMAGE,
      styleId: "id_photo_basic",
    });
    expect(result.imageUrl).toBe("https://replicate.delivery/example/first.webp");
  });

  it("returns the URL when Replicate responds with a plain string", async () => {
    mockRun.mockResolvedValueOnce("https://replicate.delivery/example/single.webp");
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
    expect(mockRun).not.toHaveBeenCalled();
  });

  it("throws when Replicate returns an empty array", async () => {
    mockRun.mockResolvedValueOnce([]);
    const mod = await import("@/lib/replicate");
    await expect(
      mod.generateStyledImage({ image: SAMPLE_IMAGE, styleId: "id_photo_basic" })
    ).rejects.toThrow();
  });

  it("propagates Replicate SDK errors", async () => {
    mockRun.mockRejectedValueOnce(new Error("upstream 422"));
    const mod = await import("@/lib/replicate");
    await expect(
      mod.generateStyledImage({ image: SAMPLE_IMAGE, styleId: "id_photo_basic" })
    ).rejects.toThrow(/upstream 422/);
  });

  it("uses aspect_ratio from style metadata when defined (e.g. 2:3 for passport)", async () => {
    mockRun.mockResolvedValueOnce(["https://replicate.delivery/example/passport.webp"]);
    const mod = await import("@/lib/replicate");
    await mod.generateStyledImage({ image: SAMPLE_IMAGE, styleId: "passport" });
    const [, options] = mockRun.mock.calls[0];
    expect(options.input.aspect_ratio).toBe("2:3");
  });

  // Replicate SDK 1.x는 `openai/gpt-image-2` 같은 모델에서
  // `client.run()`이 `FileOutput[]`을 반환한다.
  // FileOutput은 ReadableStream을 확장한 객체이며 `.url(): URL` 메서드를 노출한다.
  // wrapper가 이를 정확히 처리해야 한다.
  it("extracts URL from FileOutput[] whose .url() returns a URL object", async () => {
    const fakeFileOutput = {
      url() {
        return new URL("https://replicate.delivery/abc/result.webp");
      },
    };
    mockRun.mockResolvedValueOnce([fakeFileOutput]);
    const mod = await import("@/lib/replicate");
    const result = await mod.generateStyledImage({
      image: SAMPLE_IMAGE,
      styleId: "id_photo_basic",
    });
    expect(result.imageUrl).toBe("https://replicate.delivery/abc/result.webp");
  });

  it("extracts URL from FileOutput[] whose .url() returns a string", async () => {
    const fakeFileOutput = {
      url() {
        return "https://replicate.delivery/def/result.webp";
      },
    };
    mockRun.mockResolvedValueOnce([fakeFileOutput]);
    const mod = await import("@/lib/replicate");
    const result = await mod.generateStyledImage({
      image: SAMPLE_IMAGE,
      styleId: "id_photo_basic",
    });
    expect(result.imageUrl).toBe("https://replicate.delivery/def/result.webp");
  });

  it("extracts URL from a single FileOutput-like object (no array wrapper)", async () => {
    const fakeFileOutput = {
      url() {
        return new URL("https://replicate.delivery/ghi/single.webp");
      },
    };
    mockRun.mockResolvedValueOnce(fakeFileOutput);
    const mod = await import("@/lib/replicate");
    const result = await mod.generateStyledImage({
      image: SAMPLE_IMAGE,
      styleId: "id_photo_basic",
    });
    expect(result.imageUrl).toBe("https://replicate.delivery/ghi/single.webp");
  });

  it("extracts URL from a plain object with `url: string` property", async () => {
    mockRun.mockResolvedValueOnce([
      { url: "https://replicate.delivery/jkl/plain.webp" },
    ]);
    const mod = await import("@/lib/replicate");
    const result = await mod.generateStyledImage({
      image: SAMPLE_IMAGE,
      styleId: "id_photo_basic",
    });
    expect(result.imageUrl).toBe("https://replicate.delivery/jkl/plain.webp");
  });
});
