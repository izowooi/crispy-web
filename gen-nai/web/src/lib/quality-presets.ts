/**
 * 퀄리티 프롬프트 프리셋 — 79개 인기 스타일 분석 기반.
 * 핵심 토큰 빈도: very aesthetic(59), year 2025(58), highres(56), year 2024(54),
 *                 amazing quality(44), best quality(34+26), detailed eyes(35),
 *                 photorealistic(34), absurdres(20), masterpiece(19)
 */

export type QualityPreset = {
  id: string;
  label: string;
  description: string;
  body: string;
};

export const QUALITY_PRESETS: QualityPreset[] = [
  {
    id: "aesthetic_minimal",
    label: "Aesthetic · Minimal",
    description: "가장 가벼운 기본 — 빠르게 깔끔한 결과",
    body: "masterpiece, best quality, very aesthetic, absurdres, highres",
  },
  {
    id: "aesthetic_2024",
    label: "Aesthetic · Year 2024",
    description: "2024년 최신 NAI 모델 결과물에 적합한 표준",
    body: "masterpiece, best quality, very aesthetic, amazing quality, year 2024, highres, absurdres",
  },
  {
    id: "aesthetic_2025",
    label: "Aesthetic · Year 2025 (newest)",
    description: "더 최신 — 더 정돈된 결과",
    body: "masterpiece, best quality, very aesthetic, amazing quality, year 2025, newest, highres, absurdres, best illustration",
  },
  {
    id: "detailed_portrait",
    label: "Detailed Portrait",
    description: "초상화 — 얼굴/눈 디테일 강화",
    body: "masterpiece, best quality, very aesthetic, detailed eyes, detailed face, shiny skin, soft lighting, upper body, looking at viewer, highres, absurdres",
  },
  {
    id: "photoreal_lean",
    label: "Photoreal · Lean",
    description: "사실풍 — 피부 텍스처/디테일",
    body: "masterpiece, best quality, very aesthetic, photorealistic, detailed skin texture, super detail, hyper detail, highres, absurdres",
  },
  {
    id: "soft_anime",
    label: "Soft Anime",
    description: "부드러운 애니풍 — 자연스러운 색감",
    body: "masterpiece, best quality, very aesthetic, blush, soft lighting, detailed eyes, year 2024, highres, absurdres",
  },
  {
    id: "cinematic",
    label: "Cinematic",
    description: "영화적 조명 + 배경 디테일",
    body: "masterpiece, best quality, very aesthetic, cinematic lighting, volumetric lighting, depth of field, detailed background, dynamic pose, highres, absurdres",
  },
  {
    id: "vibrant_illustration",
    label: "Vibrant Illustration",
    description: "선명한 색감 일러스트",
    body: "masterpiece, best quality, very aesthetic, best illustration, rich colors, saturated colors, novel illustration, highres, absurdres, incredibly absurdres",
  },
  {
    id: "painterly",
    label: "Painterly",
    description: "회화풍 — 붓터치 강조",
    body: "masterpiece, best quality, very aesthetic, painterly, brushwork, soft gradients, balanced contrast, detailed shading, highres, absurdres",
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "퀄리티 태그 최소 — 작가/캐릭터 영향력을 최대화",
    body: "best quality, aesthetic, highres",
  },
];

export const DEFAULT_QUALITY_PRESET_ID = "aesthetic_2024";
