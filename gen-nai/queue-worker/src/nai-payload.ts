/**
 * NovelAI v4.5 페이로드 빌더 — gen-nai/web/src/lib/nai-payload.ts 와 동일 로직.
 */
import type { GenerateInput, SamplerId } from "./types";

export const SAMPLER_TO_NAI: Record<SamplerId, string> = {
  euler_ancestral: "k_euler_ancestral",
  euler: "k_euler",
  dpmpp_2s_ancestral: "k_dpmpp_2s_ancestral",
  dpmpp_2m_sde: "k_dpmpp_2m_sde",
  dpmpp_2m: "k_dpmpp_2m",
  dpmpp_sde: "k_dpmpp_sde",
};

function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff);
}

export function buildNaiV45Payload(input: GenerateInput) {
  const seed = input.seed !== undefined && Number.isInteger(input.seed) ? input.seed : randomSeed();
  const sampler = SAMPLER_TO_NAI[input.sampler];
  const charCaptions = (input.characters ?? []).map((c) => ({
    char_caption: c.prompt,
    centers: [{ x: 0.5, y: 0.5 }],
  }));
  const negCharCaptions = (input.characters ?? []).map((c) => ({
    char_caption: c.negativePrompt,
    centers: [{ x: 0.5, y: 0.5 }],
  }));

  return {
    input: input.prompt,
    model: "nai-diffusion-4-5-full" as const,
    action: "generate" as const,
    parameters: {
      width: input.width,
      height: input.height,
      n_samples: 4,
      seed,
      extra_noise_seed: seed,
      sampler,
      steps: input.steps,
      scale: input.guidance,
      negative_prompt: input.negativePrompt,
      cfg_rescale: 0.4,
      noise_schedule: "native" as const,
      params_version: 3 as const,
      legacy: false as const,
      legacy_v3_extend: false as const,
      add_original_image: true as const,
      legacy_uc: false as const,
      autoSmea: true as const,
      prefer_brownian: true as const,
      ucPreset: 0 as const,
      use_coords: false as const,
      v4_prompt: {
        caption: { base_caption: input.prompt, char_captions: charCaptions },
        use_coords: false as const,
        use_order: true as const,
      },
      v4_negative_prompt: {
        caption: { base_caption: input.negativePrompt, char_captions: negCharCaptions },
        legacy_uc: false as const,
      },
    },
  };
}

export async function callNai(input: GenerateInput, token: string): Promise<Uint8Array[]> {
  const { unzipSync } = await import("fflate");
  const payload = buildNaiV45Payload(input);
  const r = await fetch("https://image.novelai.net/ai/generate-image", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    throw new Error(`NAI HTTP ${r.status}: ${body.slice(0, 300)}`);
  }
  const buf = new Uint8Array(await r.arrayBuffer());
  const entries = unzipSync(buf);
  const images: Uint8Array[] = [];
  for (const [name, bytes] of Object.entries(entries)) {
    if (name.toLowerCase().endsWith(".png")) images.push(bytes);
  }
  if (images.length === 0) throw new Error("NAI 응답에 PNG가 없습니다");
  return images;
}
