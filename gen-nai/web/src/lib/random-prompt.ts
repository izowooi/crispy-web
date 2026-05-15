/**
 * 랜덤 프롬프트 제안 — 캐릭터 + 작가/스타일 + 분위기/구도 조합.
 */
import type { CharacterRow } from "./types";

const VIBES = [
  "masterpiece, best quality, very aesthetic, absurdres",
  "masterpiece, best quality, year 2024, newest, highres",
  "masterpiece, best quality, ultra detailed, atmospheric lighting",
];

const COMPOSITIONS = [
  "upper body, looking at viewer, soft smile",
  "from above, sitting, dynamic angle",
  "from below, full body, contrapposto",
  "cowboy shot, three quarter view, gentle gaze",
  "close-up portrait, dramatic lighting",
];

const ARTIST_WEIGHTS = [
  "{{artist:wlop}}, {{artist:guweiz}}",
  "{{artist:as109}}",
  "{{artist:ningen_mame}}",
  "{{artist:ciloranko}}",
  "{{artist:as109}}, {{artist:wanke}}",
];

const SCENES = [
  "soft afternoon light, blooming sakura, light particles",
  "moody neon-lit cyberpunk alley, rain",
  "rooftop at sunset, gentle wind",
  "library at night, golden lamp light",
  "snowy mountain village, lanterns",
  "underwater cathedral, god rays",
];

const NEGATIVE_BASE =
  "lowres, bad anatomy, bad hands, missing fingers, extra digit, fewer digits, blurry, signature, watermark, jpeg artifacts";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export type RandomSuggestion = {
  prompt: string;
  negativePrompt: string;
  character?: CharacterRow;
};

export function makeRandomSuggestion(characters: CharacterRow[]): RandomSuggestion {
  const ch = characters.length > 0 ? pick(characters) : undefined;
  const parts: string[] = [];
  if (ch) parts.push(ch.eng);
  parts.push("1girl");
  parts.push(pick(COMPOSITIONS));
  parts.push(pick(SCENES));
  parts.push(pick(ARTIST_WEIGHTS));
  parts.push(pick(VIBES));
  return {
    prompt: parts.join(", "),
    negativePrompt: NEGATIVE_BASE,
    character: ch,
  };
}
