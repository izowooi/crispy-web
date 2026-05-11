// server-only
// 이 파일은 클라이언트 컴포넌트에서 절대 import하면 안 된다.
// 사용처는 `src/lib/replicate.ts` 와 `src/app/api/**/route.ts` 로 한정.
// 클라이언트에 prompt가 노출되면 copy/abuse 위험이 있다.

export type AspectRatio = "1:1" | "2:3" | "3:2";

export type StylePrompt = {
  readonly id: string;
  readonly prompt: string;
  readonly negativePrompt?: string;
  readonly aspectRatio?: AspectRatio;
};

const IDENTITY_GUARD =
  " Preserve the subject's facial identity, hairstyle, skin tone, and overall composition. Do not change the person.";

export const STYLE_PROMPTS: Readonly<Record<string, StylePrompt>> = {
  id_photo_basic: {
    id: "id_photo_basic",
    prompt:
      "Convert this photo into a clean, formal Korean-style ID photograph. Frontal pose, neutral facial expression, plain light-gray background, soft even studio lighting, natural skin tones, head and shoulders framing." +
      IDENTITY_GUARD,
    aspectRatio: "2:3",
  },
  passport: {
    id: "passport",
    prompt:
      "Convert this photo into a standard passport photograph. Strict frontal view, neutral expression with closed mouth, eyes looking directly at camera, plain white background, flat even lighting with no shadows, formal attire." +
      IDENTITY_GUARD,
    aspectRatio: "2:3",
  },
  business_profile: {
    id: "business_profile",
    prompt:
      "Convert this photo into a polished business profile portrait suitable for LinkedIn and corporate websites. Subject wears a dark business suit, slight three-quarter angle, confident gentle smile, soft directional studio lighting, blurred neutral office background." +
      IDENTITY_GUARD,
    aspectRatio: "1:1",
  },
  watercolor: {
    id: "watercolor",
    prompt:
      "Convert this photo into a delicate watercolor illustration. Soft pigment bleeds, visible paper texture, gentle pastel palette, loose outlines, hand-painted brush strokes, light wash background." +
      IDENTITY_GUARD,
    aspectRatio: "1:1",
  },
  oil_painting: {
    id: "oil_painting",
    prompt:
      "Convert this photo into a classical oil painting portrait. Thick impasto brushwork, rich warm color palette, chiaroscuro lighting reminiscent of Rembrandt, textured canvas background, museum-quality finish." +
      IDENTITY_GUARD,
    aspectRatio: "2:3",
  },
  "3d_character": {
    id: "3d_character",
    prompt:
      "Convert this photo into a stylized 3D character in the style of a Pixar animated film. Soft subsurface-scattering skin, large expressive eyes, polished cel-shaded materials, cinematic key light with warm rim light, slightly cartoon-proportioned but recognizable." +
      IDENTITY_GUARD,
    aspectRatio: "1:1",
  },
  chibi_sticker: {
    id: "chibi_sticker",
    prompt:
      "Convert this photo into a cute chibi sticker. Oversized head, tiny body, bold black outlines, flat vibrant colors, simple round eyes, glossy sticker finish on a transparent or solid pastel background, die-cut style." +
      IDENTITY_GUARD,
    aspectRatio: "1:1",
  },
  anime_pastel: {
    id: "anime_pastel",
    prompt:
      "Convert this photo into a Japanese anime illustration with soft pastel cel-shading. Crisp line art, expressive eyes with highlights, gentle pastel color palette, light bokeh background, modern slice-of-life anime style." +
      IDENTITY_GUARD,
    aspectRatio: "1:1",
  },
  manga_inking: {
    id: "manga_inking",
    prompt:
      "Convert this photo into a black-and-white Japanese manga panel. Sharp ink linework, screentone shading and crosshatching, dramatic high-contrast composition, motion or speed lines in the background, no color." +
      IDENTITY_GUARD,
    aspectRatio: "2:3",
  },
  bw_studio: {
    id: "bw_studio",
    prompt:
      "Convert this photo into a high-contrast black-and-white studio portrait. Dramatic Rembrandt lighting, deep blacks and bright highlights, fine grain, plain dark background, professional fashion-photography aesthetic." +
      IDENTITY_GUARD,
    aspectRatio: "2:3",
  },
  marble_bust: {
    id: "marble_bust",
    prompt:
      "Convert this photo into a classical Greco-Roman marble bust sculpture. Carved white Carrara marble, smooth polished surface, subtle veining, museum gallery lighting, gray stone pedestal, monochrome rendering with realistic stone material." +
      IDENTITY_GUARD,
    aspectRatio: "2:3",
  },
  kbeauty_glow: {
    id: "kbeauty_glow",
    prompt:
      "Convert this photo into a luminous K-beauty portrait. Glass-skin glow with healthy dewy finish, soft pink and peach makeup, natural feathered brows, glossy lips, soft diffused beauty lighting, clean minimal background." +
      IDENTITY_GUARD,
    aspectRatio: "1:1",
  },
  editorial_glam: {
    id: "editorial_glam",
    prompt:
      "Convert this photo into a high-fashion editorial cover portrait. Bold dramatic lighting with hard rim light, glossy magazine retouching, striking makeup, fashion-forward styling, clean studio backdrop in a bold accent color." +
      IDENTITY_GUARD,
    aspectRatio: "2:3",
  },
  pixel_8bit: {
    id: "pixel_8bit",
    prompt:
      "Convert this photo into a retro 8-bit pixel-art portrait. Limited 32-color palette, blocky chunky pixels, dithered shading, clear silhouette readable at small size, plain single-color background in the style of late-80s console RPGs." +
      IDENTITY_GUARD,
    aspectRatio: "1:1",
  },
  lowpoly_geo: {
    id: "lowpoly_geo",
    prompt:
      "Convert this photo into a low-poly 3D portrait. Faceted triangular geometry, flat-shaded planes, vibrant gradient color palette, gentle studio lighting, plain gradient background, modern geometric design poster style." +
      IDENTITY_GUARD,
    aspectRatio: "1:1",
  },
};

export function getStylePrompt(styleId: string): StylePrompt | null {
  return Object.prototype.hasOwnProperty.call(STYLE_PROMPTS, styleId)
    ? STYLE_PROMPTS[styleId]
    : null;
}
