/**
 * 부정 프롬프트 프리셋 — 79개 인기 스타일에서 자주 사용된 부정 토큰 기반.
 * 핵심 토큰 빈도(out of 79): jpeg artifacts(114), chromatic aberration(87), error(85),
 *   bad quality(84), worst quality(82), bad hands(81), blurry(79), lowres(77),
 *   mutation(77), disfigured(76), deformed(75), bad proportions(75), film grain(70),
 *   fewer digits(70), bad face(69), extra legs(69), extra arms(63), username(60),
 *   too many watermarks(58), bad feet(58), long neck(55), watermark(45), signature(42),
 *   screentones(41), bad anatomy(40), text(32), logo(27), bad perspective(27)
 */

export type NegativePreset = {
  id: string;
  label: string;
  description: string;
  body: string;
};

export const NEGATIVE_PRESETS: NegativePreset[] = [
  {
    id: "standard",
    label: "Standard",
    description: "권장 기본 — 일반적인 결함을 폭넓게 차단",
    body: "worst quality, bad quality, lowres, jpeg artifacts, blurry, bad anatomy, bad hands, bad face, bad proportions, deformed, disfigured, mutation, fewer digits, extra digits, extra arms, extra legs, missing finger, bad feet, long neck, very displeasing, displeasing, error, watermark, signature, username, artist name, scan artifacts, film grain, chromatic aberration",
  },
  {
    id: "anime_clean",
    label: "Anime Clean",
    description: "애니풍 — 흑백/평면색/스크린톤도 차단",
    body: "worst quality, bad quality, lowres, jpeg artifacts, blurry, bad anatomy, bad hands, bad face, deformed, disfigured, mutation, fewer digits, extra digits, watermark, signature, flat color, monochrome, greyscale, halftone, screentones, dithering, sketch",
  },
  {
    id: "no_text",
    label: "No Text",
    description: "텍스트/로고/말풍선 차단 강화",
    body: "worst quality, bad quality, lowres, blurry, bad hands, jpeg artifacts, text, japanese text, english text, sound effect, speech bubble, logo, signature, watermark, username, artist name, dated, copyright name",
  },
  {
    id: "no_realistic",
    label: "No Realistic / 3D",
    description: "사실풍/3D 톤 차단 — 애니풍 선호 시",
    body: "worst quality, bad quality, lowres, blurry, bad anatomy, bad hands, deformed, disfigured, mutation, jpeg artifacts, watermark, signature, photorealistic, realistic, 3d, blender (medium), oil painting (medium), photo (object), waxy skin, plastic skin",
  },
  {
    id: "no_composite",
    label: "No Composite",
    description: "여러 컷/시점/콜라주 차단",
    body: "worst quality, bad quality, lowres, blurry, bad anatomy, bad hands, jpeg artifacts, watermark, signature, artist collaboration, multiple views, chart, collage, blank page, reference, duplicate, multiple panels, 4koma, 3koma, comic, split screen",
  },
  {
    id: "no_chibi",
    label: "No Chibi",
    description: "치비/단순화 차단",
    body: "worst quality, bad quality, lowres, blurry, bad hands, bad anatomy, jpeg artifacts, watermark, signature, chibi, simple background, blank page, flat color, monochrome",
  },
  {
    id: "lineart_clean",
    label: "Lineart Clean",
    description: "선화 결함/스케치 차단",
    body: "worst quality, bad quality, lowres, blurry, bad anatomy, bad hands, jpeg artifacts, watermark, signature, bad lines, jaggy lines, aliasing, sketch, unfinished, oekaki, ai-generated",
  },
  {
    id: "heavy",
    label: "Heavy (Everything)",
    description: "가능한 모든 결함 차단 — 인기 스타일의 부정 프롬프트 종합판",
    body: "worst quality, bad quality, lowres, jpeg artifacts, error, blurry, bad anatomy, bad hands, bad face, bad proportions, deformed, disfigured, mutation, fewer digits, extra digits, extra arms, extra legs, missing finger, bad feet, long neck, very displeasing, displeasing, watermark, too many watermarks, signature, username, artist name, scan artifacts, film grain, chromatic aberration, screentones, dithering, halftone, flat color, monochrome, greyscale, text, logo, sound effect, speech bubble, bad perspective, multiple views, artist collaboration, duplicate, reference, blank page, sketch, unfinished, chibi, 4koma, comic, split screen, aliasing",
  },
  {
    id: "light",
    label: "Light",
    description: "최소만 — 작가/캐릭터 영향을 최대한 살리고 싶을 때",
    body: "lowres, blurry, bad anatomy, watermark, signature, text",
  },
  {
    id: "sfw_strict",
    label: "SFW Strict",
    description: "친구 공유용 SFW 보장",
    body: "worst quality, bad quality, lowres, blurry, bad anatomy, bad hands, jpeg artifacts, watermark, signature, nsfw, explicit, nipples, pussy, breasts apart, ugly bastard, dark skin, dark-skinned male, fat man, old man",
  },
];

export const DEFAULT_NEGATIVE_PRESET_ID = "standard";
