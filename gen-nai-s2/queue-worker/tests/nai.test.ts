import { describe, expect, it } from "vitest";
import { buildNaiPayload } from "../src/nai";

const settings = {
  width: 832, height: 1216, steps: 28, cfgScale: 5, cfgRescale: 0.4,
  sampler: "k_euler_ancestral", noiseSchedule: "native", seed: 123,
  qualityToggle: true, ucPreset: 0,
};

describe("NovelAI v4.5 payload", () => {
  it("requests exactly four PNG images with the captured v4 structure", () => {
    const payload = buildNaiPayload("1girl", "bad hands", settings);
    expect(payload.model).toBe("nai-diffusion-4-5-full");
    expect(payload.parameters.n_samples).toBe(4);
    expect(payload.parameters.autoSmea).toBe(false);
    expect(payload.parameters.image_format).toBe("png");
    expect(payload.parameters).not.toHaveProperty("legacy_uc");
    expect(payload.parameters.v4_prompt.caption.base_caption).toContain("very aesthetic");
    expect(payload.parameters.negative_prompt).toContain("bad hands");
  });
});
