import { describe, it, expect } from "vitest";
import { buildNaiV45Payload, SAMPLER_TO_NAI } from "@/lib/nai-payload";

describe("buildNaiV45Payload", () => {
  const base = {
    prompt: "hu_tao_(genshin_impact), 1girl, masterpiece",
    negativePrompt: "lowres, bad anatomy",
    width: 832,
    height: 1216,
    steps: 28,
    guidance: 5,
    sampler: "euler_ancestral" as const,
  };

  it("기본 페이로드의 model은 nai-diffusion-4-5-full, action은 generate", () => {
    const p = buildNaiV45Payload(base);
    expect(p.model).toBe("nai-diffusion-4-5-full");
    expect(p.action).toBe("generate");
  });

  it("input 필드에 prompt가 들어가고 parameters.scale에 guidance가 매핑된다", () => {
    const p = buildNaiV45Payload(base);
    expect(p.input).toBe(base.prompt);
    expect(p.parameters.scale).toBe(5);
  });

  it("v4_prompt.caption.base_caption 과 v4_negative_prompt.caption.base_caption 이 채워진다", () => {
    const p = buildNaiV45Payload(base);
    expect(p.parameters.v4_prompt.caption.base_caption).toBe(base.prompt);
    expect(p.parameters.v4_negative_prompt.caption.base_caption).toBe(base.negativePrompt);
  });

  it("seed가 주어지면 그대로 사용되고, 미지정 시 0 이상의 정수가 생성된다", () => {
    const p1 = buildNaiV45Payload({ ...base, seed: 12345 });
    expect(p1.parameters.seed).toBe(12345);
    expect(p1.parameters.extra_noise_seed).toBe(12345);

    const p2 = buildNaiV45Payload({ ...base });
    expect(Number.isInteger(p2.parameters.seed)).toBe(true);
    expect(p2.parameters.seed).toBeGreaterThanOrEqual(0);
    expect(p2.parameters.seed).toBeLessThan(2 ** 32);
  });

  it("샘플러 UI ID를 NAI API ID로 매핑한다", () => {
    expect(SAMPLER_TO_NAI.euler_ancestral).toBe("k_euler_ancestral");
    expect(SAMPLER_TO_NAI.euler).toBe("k_euler");
    expect(SAMPLER_TO_NAI.dpmpp_2s_ancestral).toBe("k_dpmpp_2s_ancestral");
    expect(SAMPLER_TO_NAI.dpmpp_2m_sde).toBe("k_dpmpp_2m_sde");
    expect(SAMPLER_TO_NAI.dpmpp_2m).toBe("k_dpmpp_2m");
    expect(SAMPLER_TO_NAI.dpmpp_sde).toBe("k_dpmpp_sde");
    const p = buildNaiV45Payload({ ...base, sampler: "dpmpp_2m" });
    expect(p.parameters.sampler).toBe("k_dpmpp_2m");
  });

  it("characters를 주면 v4_prompt/v4_negative_prompt의 char_captions에 같은 인덱스로 추가된다", () => {
    const p = buildNaiV45Payload({
      ...base,
      characters: [
        { prompt: "hu_tao_(genshin_impact), 1girl", negativePrompt: "bad hands" },
        { prompt: "ganyu_(genshin_impact), 1girl", negativePrompt: "blurry" },
      ],
    });
    expect(p.parameters.v4_prompt.caption.char_captions).toHaveLength(2);
    expect(p.parameters.v4_negative_prompt.caption.char_captions).toHaveLength(2);
    expect(p.parameters.v4_prompt.caption.char_captions[0].char_caption).toContain("hu_tao");
    expect(p.parameters.v4_negative_prompt.caption.char_captions[1].char_caption).toBe("blurry");
    expect(p.parameters.v4_prompt.caption.char_captions[0].centers).toEqual([{ x: 0.5, y: 0.5 }]);
  });

  it("v4 전용 고정값들이 설정된다 (n_samples=4 로 한 요청에 4장)", () => {
    const p = buildNaiV45Payload(base);
    expect(p.parameters.params_version).toBe(3);
    expect(p.parameters.legacy).toBe(false);
    expect(p.parameters.legacy_v3_extend).toBe(false);
    expect(p.parameters.add_original_image).toBe(true);
    expect(p.parameters.legacy_uc).toBe(false);
    expect(p.parameters.autoSmea).toBe(true);
    expect(p.parameters.prefer_brownian).toBe(true);
    expect(p.parameters.ucPreset).toBe(0);
    expect(p.parameters.use_coords).toBe(false);
    expect(p.parameters.cfg_rescale).toBeCloseTo(0.4);
    expect(p.parameters.noise_schedule).toBe("native");
    expect(p.parameters.n_samples).toBe(4);
  });

  it("해상도/스텝/네거티브가 그대로 반영된다", () => {
    const p = buildNaiV45Payload({
      ...base,
      width: 1216,
      height: 832,
      steps: 30,
    });
    expect(p.parameters.width).toBe(1216);
    expect(p.parameters.height).toBe(832);
    expect(p.parameters.steps).toBe(30);
    expect(p.parameters.negative_prompt).toBe(base.negativePrompt);
  });
});
