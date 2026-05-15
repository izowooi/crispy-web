/**
 * NovelAI v4.5 (nai-diffusion-4-5-full) generate-image 페이로드 빌더.
 * 1차 자료: /Users/izowooi/git/NAIA2.0_origiin/core/api_service.py
 * 스킬: .claude/skills/nai-api-client/SKILL.md
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

export type NaiCharCaption = {
  char_caption: string;
  centers: { x: number; y: number }[];
};

export type NaiV45Payload = {
  input: string;
  model: "nai-diffusion-4-5-full";
  action: "generate";
  parameters: {
    width: number;
    height: number;
    n_samples: 1;
    seed: number;
    extra_noise_seed: number;
    sampler: string;
    steps: number;
    scale: number;
    negative_prompt: string;
    cfg_rescale: number;
    noise_schedule: "native";
    params_version: 3;
    legacy: false;
    legacy_v3_extend: false;
    add_original_image: true;
    legacy_uc: false;
    autoSmea: true;
    prefer_brownian: true;
    ucPreset: 0;
    use_coords: false;
    v4_prompt: {
      caption: { base_caption: string; char_captions: NaiCharCaption[] };
      use_coords: false;
      use_order: true;
    };
    v4_negative_prompt: {
      caption: { base_caption: string; char_captions: NaiCharCaption[] };
      legacy_uc: false;
    };
  };
};

function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff);
}

export function buildNaiV45Payload(input: GenerateInput): NaiV45Payload {
  const seed = input.seed !== undefined && Number.isInteger(input.seed) ? input.seed : randomSeed();
  const sampler = SAMPLER_TO_NAI[input.sampler];

  const charCaptions: NaiCharCaption[] = (input.characters ?? []).map((c) => ({
    char_caption: c.prompt,
    centers: [{ x: 0.5, y: 0.5 }],
  }));
  const negCharCaptions: NaiCharCaption[] = (input.characters ?? []).map((c) => ({
    char_caption: c.negativePrompt,
    centers: [{ x: 0.5, y: 0.5 }],
  }));

  return {
    input: input.prompt,
    model: "nai-diffusion-4-5-full",
    action: "generate",
    parameters: {
      width: input.width,
      height: input.height,
      n_samples: 1,
      seed,
      extra_noise_seed: seed,
      sampler,
      steps: input.steps,
      scale: input.guidance,
      negative_prompt: input.negativePrompt,
      cfg_rescale: 0.4,
      noise_schedule: "native",
      params_version: 3,
      legacy: false,
      legacy_v3_extend: false,
      add_original_image: true,
      legacy_uc: false,
      autoSmea: true,
      prefer_brownian: true,
      ucPreset: 0,
      use_coords: false,
      v4_prompt: {
        caption: { base_caption: input.prompt, char_captions: charCaptions },
        use_coords: false,
        use_order: true,
      },
      v4_negative_prompt: {
        caption: { base_caption: input.negativePrompt, char_captions: negCharCaptions },
        legacy_uc: false,
      },
    },
  };
}
