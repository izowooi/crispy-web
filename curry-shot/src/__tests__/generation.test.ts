import { describe, expect, it } from "vitest";

import {
  IMAGE_MODEL_SLUGS,
  MAX_IMAGE_BYTES,
  TEXT_LIMITS,
  VIDEO_MODEL_SLUGS,
  ValidationError,
  buildImagePrompt,
  buildReplicateImageInput,
  buildReplicateVideoInput,
  calculateImageSize,
  isAllowedReplicateUrl,
  parseImageFormData,
  parseVideoFormData,
  readMultipartFormData,
} from "@/lib/server/generation";

function validImage(name = "source.webp") {
  return new File(["image"], name, { type: "image/webp" });
}

function imageForm(overrides: Record<string, string | Blob | undefined> = {}) {
  const form = new FormData();
  const fields: Record<string, string | Blob> = {
    image: validImage(),
    provider: "openai",
    sourceMode: "scene",
    treatment: "faithful",
    count: "1",
    quality: "medium",
    replicateModel: "flux",
    keepTitle: "false",
    width: "1920",
    height: "1080",
    ...overrides,
  };

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    form.set(key, value);
  }
  return form;
}

describe("calculateImageSize", () => {
  it("keeps the source ratio while capping the longest edge and aligning to 16px", () => {
    expect(calculateImageSize(1920, 1080)).toEqual({
      width: 1536,
      height: 864,
      size: "1536x864",
    });
  });

  it("raises small images to the minimum pixel budget", () => {
    expect(calculateImageSize(320, 200)).toEqual({
      width: 1024,
      height: 640,
      size: "1024x640",
    });
  });

  it("always satisfies the custom gpt-image-2 limits", () => {
    for (const [width, height] of [
      [9000, 300],
      [300, 9000],
      [1, 1],
      [1535, 1001],
    ]) {
      const result = calculateImageSize(width, height);
      expect(result.width % 16).toBe(0);
      expect(result.height % 16).toBe(0);
      expect(Math.max(result.width, result.height)).toBeLessThanOrEqual(1536);
      expect(Math.max(result.width / result.height, result.height / result.width)).toBeLessThanOrEqual(3);
      expect(result.width * result.height).toBeGreaterThanOrEqual(655_360);
    }
  });
});

describe("multipart validation", () => {
  it("rejects non-multipart HTTP requests as a safe validation error", async () => {
    await expect(
      readMultipartFormData(
        new Request("https://example.test/api/images", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        }),
      ),
    ).rejects.toMatchObject({
      code: "FORM_DATA_REQUIRED",
      status: 400,
    });
  });

  it("parses a complete image request", () => {
    const parsed = parseImageFormData(
      imageForm({
        provider: "replicate",
        sourceMode: "cover",
        treatment: "cinematic",
        count: "4",
        quality: "high",
        replicateModel: "seedream",
        keepTitle: "true",
        preservedTitle: "Forgotten Saga",
      }),
    );

    expect(parsed.provider).toBe("replicate");
    expect(parsed.count).toBe(4);
    expect(parsed.keepTitle).toBe(true);
    expect(parsed.outputSize.size).toBe("1536x864");
  });

  it("rejects unsupported media types, oversized files, invalid counts, and overlong text", () => {
    expect(() =>
      parseImageFormData(imageForm({ image: new File(["x"], "x.gif", { type: "image/gif" }) })),
    ).toThrow(ValidationError);

    const oversized = validImage();
    Object.defineProperty(oversized, "size", { value: MAX_IMAGE_BYTES + 1 });
    expect(() => parseImageFormData(imageForm({ image: oversized }))).toThrow(ValidationError);
    expect(() => parseImageFormData(imageForm({ count: "3" }))).toThrow(ValidationError);
    expect(() =>
      parseImageFormData(imageForm({ customPrompt: "x".repeat(TEXT_LIMITS.customPrompt + 1) })),
    ).toThrow(ValidationError);
  });

  it("requires both dimensions when a custom source size is supplied", () => {
    expect(() => parseImageFormData(imageForm({ height: undefined }))).toThrow(ValidationError);
  });

  it("derives OpenAI custom output size from ratio and keeps Replicate source-matched", () => {
    const portrait = parseImageFormData(imageForm({
      outputRatio: "portrait",
      sourceWidth: "1920",
      sourceHeight: "1080",
    }));
    expect(portrait.outputRatio).toBe("portrait");
    expect(portrait.outputSize.size).toBe("1024x1536");

    expect(() => parseImageFormData(imageForm({
      provider: "replicate",
      outputRatio: "square",
    }))).toThrowError(expect.objectContaining({ code: "OUTPUT_RATIO_UNSUPPORTED" }));
  });
});

describe("buildImagePrompt", () => {
  it("locks composition and turns a cover insert into full-bleed art with a clean title-safe area", () => {
    const prompt = buildImagePrompt({
      sourceMode: "cover",
      treatment: "faithful",
      keepTitle: true,
      preservedTitle: "Forgotten Saga",
      speaker: "",
      dialogue: "",
      customPrompt: "warmer sunset",
      outputRatio: "source",
    });

    expect(prompt).toContain("IMMUTABLE COMPOSITION BLUEPRINT");
    expect(prompt).toContain("full-bleed");
    expect(prompt).toContain("clean title-safe area");
    expect(prompt).not.toContain("Forgotten Saga");
    expect(prompt).toContain("Remove all printed text and logos");
    expect(prompt).toContain("lower-priority preference");
    expect(prompt).toContain("camera position");
  });

  it("keeps a dialogue layout but never asks the model to render supplied dialogue", () => {
    const prompt = buildImagePrompt({
      sourceMode: "dialogue",
      treatment: "cinematic",
      keepTitle: false,
      preservedTitle: "",
      speaker: "Ruka",
      dialogue: "This must be overlaid later.",
      customPrompt: "",
      outputRatio: "source",
    });

    expect(prompt).toContain("portrait zone");
    expect(prompt).toContain("top-down scene zone");
    expect(prompt).toContain("blank, clean dialogue panel");
    expect(prompt).not.toContain("Ruka");
    expect(prompt).not.toContain("This must be overlaid later.");
  });

  it("removes letterboxing and watermarks from ordinary scenes", () => {
    const prompt = buildImagePrompt({
      sourceMode: "scene",
      treatment: "faithful",
      keepTitle: false,
      preservedTitle: "",
      speaker: "",
      dialogue: "",
      customPrompt: "",
      outputRatio: "source",
    });

    expect(prompt).toContain("letterbox bars");
    expect(prompt).toContain("watermarks");
    expect(prompt).toContain("Do not add, remove, replace, or reposition");
  });

  it("uses background extension instead of crop when OpenAI output ratio changes", () => {
    const prompt = buildImagePrompt({
      sourceMode: "scene",
      treatment: "faithful",
      keepTitle: false,
      preservedTitle: "",
      speaker: "",
      dialogue: "",
      customPrompt: "",
      outputRatio: "portrait",
    });

    expect(prompt).toContain("different aspect ratio");
    expect(prompt).toContain("Do not crop, stretch, zoom, or rearrange");
    expect(prompt).toContain("newly added canvas area");
  });
});

describe("Replicate model mappings", () => {
  it("maps every image option to the official owner/model slug", () => {
    expect(IMAGE_MODEL_SLUGS).toEqual({
      flux: "black-forest-labs/flux-2-flex",
      seedream: "bytedance/seedream-4.5",
      nano: "google/nano-banana-2",
    });
  });

  it("builds locked single-output image inputs", () => {
    expect(buildReplicateImageInput("flux", "prompt", "data:image/webp;base64,eA==")).toMatchObject({
      input_images: ["data:image/webp;base64,eA=="],
      aspect_ratio: "match_input_image",
      resolution: "1 MP",
      steps: 30,
      guidance: 4.5,
      prompt_upsampling: false,
      output_format: "webp",
      output_quality: 90,
      safety_tolerance: 2,
    });

    expect(buildReplicateImageInput("seedream", "prompt", "image")).toMatchObject({
      image_input: ["image"],
      size: "2K",
      aspect_ratio: "match_input_image",
      sequential_image_generation: "disabled",
      max_images: 1,
    });

    expect(buildReplicateImageInput("nano", "prompt", "image")).toMatchObject({
      image_input: ["image"],
      aspect_ratio: "match_input_image",
      resolution: "2K",
      output_format: "webp",
      google_search: false,
      image_search: false,
    });
  });

  it("keeps Grok's automatic audio implicit and Seedance audio explicit", () => {
    expect(VIDEO_MODEL_SLUGS.seedance).toBe("bytedance/seedance-2.0");
    expect(buildReplicateVideoInput("seedance", "motion", "image", false)).toEqual({
      prompt: "motion",
      image: "image",
      duration: 5,
      resolution: "720p",
      aspect_ratio: "adaptive",
      generate_audio: false,
    });

    const grok = buildReplicateVideoInput("grok", "motion", "image", false);
    expect(grok).toEqual({
      prompt: "motion",
      image: "image",
      duration: 5,
      resolution: "720p",
      aspect_ratio: "auto",
    });
    expect(grok).not.toHaveProperty("generate_audio");
  });
});

describe("video validation", () => {
  it("accepts only HTTPS replicate.delivery URLs", () => {
    expect(isAllowedReplicateUrl("https://replicate.delivery/xezq/file.webp")).toBe(true);
    expect(isAllowedReplicateUrl("https://cdn.replicate.delivery/file.webp")).toBe(true);
    expect(isAllowedReplicateUrl("http://replicate.delivery/file.webp")).toBe(false);
    expect(isAllowedReplicateUrl("https://replicate.delivery.evil.example/file.webp")).toBe(false);
  });

  it("requires confirmation and exactly one source", () => {
    const form = new FormData();
    form.set("model", "seedance");
    form.set("motionPrompt", "A slow camera push-in.");
    form.set("confirmed", "true");
    form.set("sourceUrl", "https://replicate.delivery/xezq/source.webp");
    expect(parseVideoFormData(form).audio).toBe(true);

    form.set("image", validImage());
    expect(() => parseVideoFormData(form)).toThrow(ValidationError);

    form.delete("sourceUrl");
    form.set("confirmed", "false");
    expect(() => parseVideoFormData(form)).toThrow(ValidationError);
  });
});
