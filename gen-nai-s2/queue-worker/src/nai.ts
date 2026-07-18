import { unzipSync } from "fflate";
import type { Settings } from "./types";

const QUALITY_SUFFIX = ", very aesthetic, masterpiece, no text";
const HEAVY = "nsfw, lowres, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, dithering, halftone, screentone, multiple views, logo, too many watermarks, negative space, blank page";
const UC: Record<number, string> = {
  0: HEAVY,
  1: "nsfw, lowres, artistic error, scan artifacts, worst quality, bad quality, jpeg artifacts, multiple views, very displeasing, too many watermarks, negative space, blank page",
  2: "",
  3: `${HEAVY}, @_@, mismatched pupils, glowing eyes, bad anatomy`,
  4: "",
};

export function buildNaiPayload(promptRaw: string, negativeRaw: string, settings: Settings) {
  const prompt = settings.qualityToggle ? `${promptRaw}${QUALITY_SUFFIX}` : promptRaw;
  const preset = UC[settings.ucPreset] ?? "";
  const negative = preset ? `${preset}${negativeRaw ? `, ${negativeRaw}` : ""}` : negativeRaw;
  const seed = settings.seed ?? Math.floor(Math.random() * 0x100000000);
  return {
    action: "generate", input: prompt, model: "nai-diffusion-4-5-full",
    parameters: {
      params_version: 3, width: settings.width, height: settings.height, scale: settings.cfgScale,
      sampler: settings.sampler, steps: settings.steps, n_samples: 4, ucPreset: settings.ucPreset,
      qualityToggle: settings.qualityToggle, autoSmea: false, dynamic_thresholding: false,
      controlnet_strength: 1, legacy: false, add_original_image: true, cfg_rescale: settings.cfgRescale,
      noise_schedule: settings.noiseSchedule, legacy_v3_extend: false, skip_cfg_above_sigma: null,
      use_coords: false, normalize_reference_strength_multiple: true, inpaintImg2ImgStrength: 1,
      seed,
      v4_prompt: { caption: { base_caption: prompt, char_captions: [] }, use_coords: false, use_order: true },
      v4_negative_prompt: { caption: { base_caption: negative, char_captions: [] } },
      characterPrompts: [], negative_prompt: negative, deliberate_euler_ancestral_bug: false,
      prefer_brownian: true, image_format: "png",
    },
  };
}

export async function callNai(prompt: string, negative: string, settings: Settings, token: string, baseUrl = "https://image.novelai.net"): Promise<Uint8Array[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/ai/generate-image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(buildNaiPayload(prompt, negative, settings)), signal: controller.signal,
    });
    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).replace(/pst-[A-Za-z0-9_\-]+/g, "pst-***").slice(0, 300);
      const error = new Error(`NovelAI ${response.status}: ${detail}`) as Error & { retryAfter?: number };
      const retry = Number(response.headers.get("retry-after"));
      if (Number.isFinite(retry)) error.retryAfter = retry;
      throw error;
    }
    const archive = unzipSync(new Uint8Array(await response.arrayBuffer()));
    const images = Object.entries(archive).filter(([name]) => name.toLowerCase().endsWith(".png")).map(([, data]) => data);
    if (images.length !== 4) throw new Error(`NovelAI ZIP에 PNG가 ${images.length}개 있습니다 (4개 필요)`);
    return images;
  } finally {
    clearTimeout(timeout);
  }
}
