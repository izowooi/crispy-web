/**
 * Prompt 기본/랜덤 — 작가 + 퀄리티 + 초상화 컴포지션 중심.
 *
 * 캐릭터 태그는 page.tsx가 finalPrompt 조립 시 앞에 붙인다.
 * 외모/체형/얼굴은 캐릭터 태그가 책임지므로 여기서 다루지 않는다.
 */

/** 인기 Danbooru 작가 — 셔플해서 2~4명 조합으로 사용. NAI 4.5에서 검증된 페어들 중심 */
const SEED_ARTISTS = [
  "{{artist:wlop}}",
  "{{artist:as109}}",
  "{{artist:ciloranko}}",
  "{{artist:ningen_mame}}",
  "{{artist:rumoon}}",
  "{{artist:torino_aqua}}",
  "{{artist:wanke}}",
  "{{artist:ask_(askzy)}}",
  "{{artist:guweiz}}",
  "{{artist:mika_pikazo}}",
  "{{artist:kantoku}}",
  "{{artist:rella}}",
  "{{artist:ke-ta}}",
  "{{artist:redjuice}}",
  "{{artist:wanke}}",
  "{{artist:taesi}}",
  "{{artist:kidmo}}",
  "{{artist:firolian}}",
];

/** 초상화 컴포지션 — 캐릭터 중심이라 "1girl/1boy" 옆에 함께 들어감 */
const PORTRAIT_COMPS = [
  "upper body, looking at viewer",
  "portrait, looking at viewer, soft smile",
  "cowboy shot, three quarter view",
  "close-up portrait, gentle gaze",
  "upper body, head tilt",
];

/** 시즌/스타일 가벼운 토큰 */
const FLAVOR = [
  "year 2024",
  "year 2025",
  "newest",
  "detailed background",
];

const QUALITY = "masterpiece, best quality, very aesthetic, absurdres, highres";

export const DEFAULT_NEGATIVE =
  "worst quality, lowres, bad anatomy, bad hands, missing fingers, blurry, signature, watermark, jpeg artifacts, split screen, multiple views, monochrome, greyscale";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

/** 기본 Prompt 박스 채움: 작가 3명 + 컴포지션 + 시즌 + 퀄리티 */
export function defaultPrompt(): string {
  const artists = pickN(SEED_ARTISTS, 3).join(", ");
  return [artists, pick(PORTRAIT_COMPS), pick(FLAVOR), QUALITY].join(", ");
}

/** 🎲 Random — 새 작가 조합 + 컴포지션 셔플 */
export function randomPrompt(): string {
  return defaultPrompt();
}
