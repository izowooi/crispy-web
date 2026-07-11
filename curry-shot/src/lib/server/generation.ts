/**
 * Server boundary for generation validation and provider payload construction.
 *
 * This module is intentionally kept under `src/lib/server` and is imported only
 * by route handlers. Do not import it from Client Components: it contains the
 * prompt policy that must not be shipped to browsers.
 */

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MIN_OUTPUT_PIXELS = 655_360;
export const MAX_OUTPUT_EDGE = 1_536;
export const MAX_OUTPUT_RATIO = 3;

export const TEXT_LIMITS = {
  preservedTitle: 160,
  speaker: 80,
  dialogue: 1_000,
  customPrompt: 1_500,
  motionPrompt: 1_000,
} as const;

export const IMAGE_MODEL_SLUGS = {
  flux: "black-forest-labs/flux-2-flex",
  seedream: "bytedance/seedream-4.5",
  nano: "google/nano-banana-2",
} as const;

export const VIDEO_MODEL_SLUGS = {
  seedance: "bytedance/seedance-2.0",
  grok: "xai/grok-imagine-video-1.5",
} as const;

export type ImageProvider = "openai" | "replicate";
export type SourceMode = "scene" | "cover" | "dialogue";
export type Treatment = "faithful" | "cinematic";
export type OutputRatio = "source" | "landscape" | "portrait" | "square";
export type ImageCount = 1 | 2 | 4;
export type ImageQuality = "medium" | "high";
export type ReplicateImageModel = keyof typeof IMAGE_MODEL_SLUGS;
export type ReplicateVideoModel = keyof typeof VIDEO_MODEL_SLUGS;

export type OutputSize = {
  readonly width: number;
  readonly height: number;
  readonly size: `${number}x${number}`;
};

export type ImageGenerationRequest = {
  readonly image: File;
  readonly provider: ImageProvider;
  readonly sourceMode: SourceMode;
  readonly treatment: Treatment;
  readonly count: ImageCount;
  readonly quality: ImageQuality;
  readonly replicateModel: ReplicateImageModel;
  readonly keepTitle: boolean;
  readonly preservedTitle: string;
  readonly speaker: string;
  readonly dialogue: string;
  readonly customPrompt: string;
  readonly outputRatio: OutputRatio;
  readonly outputSize: OutputSize;
};

export type VideoGenerationRequest = {
  readonly image?: File;
  readonly sourceUrl?: string;
  readonly model: ReplicateVideoModel;
  readonly motionPrompt: string;
  readonly audio: boolean;
  readonly confirmed: true;
};

export class ValidationError extends Error {
  readonly status = 400;

  constructor(
    readonly code: string,
    readonly safeMessage: string,
  ) {
    super(safeMessage);
    this.name = "ValidationError";
  }
}

export async function readMultipartFormData(request: Request): Promise<FormData> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    throw new ValidationError(
      "FORM_DATA_REQUIRED",
      "이미지 파일을 포함한 multipart 요청이 필요합니다.",
    );
  }
  try {
    return await request.formData();
  } catch {
    throw new ValidationError(
      "FORM_DATA_INVALID",
      "업로드 요청을 읽지 못했습니다. 파일을 다시 선택해주세요.",
    );
  }
}

const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function isFileLike(value: FormDataEntryValue | null): value is File {
  if (value === null || typeof value !== "object") return false;
  const candidate = value as File;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.type === "string" &&
    typeof candidate.size === "number" &&
    typeof candidate.arrayBuffer === "function"
  );
}

export function validateImageFile(value: FormDataEntryValue | null): File {
  if (!isFileLike(value)) {
    throw new ValidationError("IMAGE_REQUIRED", "실사화할 이미지를 선택해주세요.");
  }
  if (!ACCEPTED_IMAGE_TYPES.has(value.type.toLowerCase())) {
    throw new ValidationError("IMAGE_TYPE_UNSUPPORTED", "JPG, PNG, WebP 이미지만 사용할 수 있습니다.");
  }
  if (value.size <= 0) {
    throw new ValidationError("IMAGE_EMPTY", "비어 있는 이미지 파일은 사용할 수 없습니다.");
  }
  if (value.size > MAX_IMAGE_BYTES) {
    throw new ValidationError("IMAGE_TOO_LARGE", "이미지는 10MB 이하로 준비해주세요.");
  }
  return value;
}

function textValue(form: FormData, key: string): string | undefined {
  const value = form.get(key);
  if (value === null) return undefined;
  if (typeof value !== "string") {
    throw new ValidationError("FIELD_INVALID", `${key} 필드 형식이 올바르지 않습니다.`);
  }
  return value.trim();
}

function limitedText(
  form: FormData,
  key: keyof typeof TEXT_LIMITS,
  fallback = "",
): string {
  const value = textValue(form, key) ?? fallback;
  if (value.length > TEXT_LIMITS[key]) {
    throw new ValidationError(
      "TEXT_TOO_LONG",
      `${key} 입력은 ${TEXT_LIMITS[key]}자 이하로 작성해주세요.`,
    );
  }
  return value;
}

function enumValue<const T extends readonly string[]>(
  form: FormData,
  key: string,
  allowed: T,
  fallback: T[number],
): T[number] {
  const value = textValue(form, key) ?? fallback;
  if (!allowed.includes(value)) {
    throw new ValidationError("FIELD_INVALID", `${key} 선택값이 올바르지 않습니다.`);
  }
  return value;
}

function booleanValue(form: FormData, key: string, fallback: boolean): boolean {
  const value = textValue(form, key);
  if (value === undefined || value === "") return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new ValidationError("FIELD_INVALID", `${key} 값은 true 또는 false여야 합니다.`);
}

function positiveInteger(value: string | undefined, key: string): number | undefined {
  if (value === undefined || value === "") return undefined;
  if (!/^\d+$/.test(value)) {
    throw new ValidationError("DIMENSIONS_INVALID", `${key} 값은 양의 정수여야 합니다.`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0 || parsed > 100_000) {
    throw new ValidationError("DIMENSIONS_INVALID", `${key} 값의 범위를 확인해주세요.`);
  }
  return parsed;
}

function roundTo16(value: number): number {
  return Math.max(16, Math.min(MAX_OUTPUT_EDGE, Math.round(value / 16) * 16));
}

/**
 * Converts source dimensions to a conservative custom GPT Image 2 size.
 * It preserves the source ratio where possible, clamps panoramas to 3:1,
 * aligns both edges to 16px, and scales only as needed to satisfy the model's
 * minimum pixel budget and this app's 1536px reliability/cost ceiling.
 */
export function calculateImageSize(sourceWidth: number, sourceHeight: number): OutputSize {
  if (
    !Number.isFinite(sourceWidth) ||
    !Number.isFinite(sourceHeight) ||
    sourceWidth <= 0 ||
    sourceHeight <= 0
  ) {
    throw new ValidationError("DIMENSIONS_INVALID", "이미지 크기를 확인할 수 없습니다.");
  }

  let width = sourceWidth;
  let height = sourceHeight;

  if (width / height > MAX_OUTPUT_RATIO) width = height * MAX_OUTPUT_RATIO;
  if (height / width > MAX_OUTPUT_RATIO) height = width * MAX_OUTPUT_RATIO;

  const downscale = Math.min(1, MAX_OUTPUT_EDGE / Math.max(width, height));
  width *= downscale;
  height *= downscale;

  if (width * height < MIN_OUTPUT_PIXELS) {
    const upscale = Math.sqrt(MIN_OUTPUT_PIXELS / (width * height));
    width *= upscale;
    height *= upscale;
  }

  let roundedWidth = roundTo16(width);
  let roundedHeight = roundTo16(height);

  // Rounding can push a 3:1 source a fraction beyond the ratio limit.
  if (roundedWidth / roundedHeight > MAX_OUTPUT_RATIO) {
    roundedHeight = Math.ceil(roundedWidth / MAX_OUTPUT_RATIO / 16) * 16;
  } else if (roundedHeight / roundedWidth > MAX_OUTPUT_RATIO) {
    roundedWidth = Math.ceil(roundedHeight / MAX_OUTPUT_RATIO / 16) * 16;
  }

  // Nearest-16 rounding can fall just below the minimum pixel budget.
  if (roundedWidth * roundedHeight < MIN_OUTPUT_PIXELS) {
    if (roundedWidth >= roundedHeight) {
      roundedHeight = Math.ceil(MIN_OUTPUT_PIXELS / roundedWidth / 16) * 16;
    } else {
      roundedWidth = Math.ceil(MIN_OUTPUT_PIXELS / roundedHeight / 16) * 16;
    }
  }

  roundedWidth = Math.min(roundedWidth, MAX_OUTPUT_EDGE);
  roundedHeight = Math.min(roundedHeight, MAX_OUTPUT_EDGE);

  return {
    width: roundedWidth,
    height: roundedHeight,
    size: `${roundedWidth}x${roundedHeight}`,
  };
}

export function parseImageFormData(form: FormData): ImageGenerationRequest {
  const image = validateImageFile(form.get("image"));
  const provider = enumValue(form, "provider", ["openai", "replicate"] as const, "openai");
  const sourceMode = enumValue(form, "sourceMode", ["scene", "cover", "dialogue"] as const, "scene");
  const treatment = enumValue(form, "treatment", ["faithful", "cinematic"] as const, "faithful");
  const quality = enumValue(form, "quality", ["medium", "high"] as const, "medium");
  const replicateModel = enumValue(form, "replicateModel", ["flux", "seedream", "nano"] as const, "flux");
  const outputRatio = enumValue(
    form,
    "outputRatio",
    ["source", "landscape", "portrait", "square"] as const,
    "source",
  );
  const countText = textValue(form, "count") ?? "1";
  if (countText !== "1" && countText !== "2" && countText !== "4") {
    throw new ValidationError("COUNT_INVALID", "이미지는 1장, 2장 또는 4장만 생성할 수 있습니다.");
  }
  const count = Number(countText) as ImageCount;
  const keepTitle = booleanValue(form, "keepTitle", false);
  const preservedTitle = limitedText(form, "preservedTitle");
  const speaker = limitedText(form, "speaker");
  const dialogue = limitedText(form, "dialogue");
  const customPrompt = limitedText(form, "customPrompt");

  if (keepTitle && preservedTitle.length === 0) {
    throw new ValidationError("TITLE_REQUIRED", "보존할 제목을 정확히 입력해주세요.");
  }

  if (provider === "replicate" && outputRatio !== "source") {
    throw new ValidationError(
      "OUTPUT_RATIO_UNSUPPORTED",
      "Replicate 이미지 모델은 원본 비율 유지로만 생성할 수 있습니다.",
    );
  }

  const sourceWidth = positiveInteger(
    textValue(form, "sourceWidth") ?? textValue(form, "width"),
    "sourceWidth",
  );
  const sourceHeight = positiveInteger(
    textValue(form, "sourceHeight") ?? textValue(form, "height"),
    "sourceHeight",
  );
  if ((sourceWidth === undefined) !== (sourceHeight === undefined)) {
    throw new ValidationError("DIMENSIONS_INVALID", "이미지의 가로와 세로 크기를 함께 보내주세요.");
  }
  const outputSize = outputRatio === "landscape"
    ? calculateImageSize(1_536, 1_024)
    : outputRatio === "portrait"
      ? calculateImageSize(1_024, 1_536)
      : outputRatio === "square"
        ? calculateImageSize(1_024, 1_024)
        : calculateImageSize(sourceWidth ?? 1_024, sourceHeight ?? 1_024);

  return {
    image,
    provider,
    sourceMode,
    treatment,
    count,
    quality,
    replicateModel,
    keepTitle,
    preservedTitle,
    speaker,
    dialogue,
    customPrompt,
    outputRatio,
    outputSize,
  };
}

export function buildImagePrompt(options: Pick<
  ImageGenerationRequest,
  | "sourceMode"
  | "treatment"
  | "keepTitle"
  | "preservedTitle"
  | "speaker"
  | "dialogue"
  | "customPrompt"
  | "outputRatio"
>): string {
  const treatment =
    options.treatment === "cinematic"
      ? `CINEMATIC TREATMENT: Render this as a premium live-action film still with physically plausible production design, nuanced cinematic lighting, restrained film color, realistic optics, and natural atmospheric depth. Cinematic polish may affect only material realism, light quality, and photographic finish; it may not redesign or rearrange the source.`
      : `FAITHFUL TREATMENT: Render this as a grounded, believable live-action photograph with natural light behavior, authentic skin, fabric, metal, wood, stone, vegetation, and weather. Avoid poster-like exaggeration. Change only the rendering medium, not the scene design.`;

  let modeRules: string;
  if (options.sourceMode === "cover") {
    const titleRule = options.keepTitle
      ? `Remove all printed text and logos, including the original title. Preserve the title's relative placement, negative space, contrast, and visual hierarchy as a clean title-safe area for a later deterministic overlay. Never render, imitate, paraphrase, or invent title glyphs.`
      : `Remove all text, logos, publisher marks, credits, rating badges, seals, and watermarks.`;
    modeRules = `COVER / DISC SOURCE RULES:
- Treat the photographed or scanned physical product only as a container for its insert illustration.
- Isolate and reconstruct the insert artwork as full-bleed scene art covering the entire output canvas.
- Do not depict a CD or disc, jewel case, box, paper edge, table, fingers, glare, plastic reflections, stickers, or packaging geometry.
- Preserve the composition contained inside the artwork; extend only the existing background naturally into space freed by removed packaging.
- ${titleRule}`;
  } else if (options.sourceMode === "dialogue") {
    const transcriptRule = options.speaker || options.dialogue
      ? "A transcript was supplied separately for deterministic UI overlay; never render or paraphrase that transcript inside the generated pixels."
      : "Do not invent dialogue or speaker text.";
    modeRules = `DIALOGUE SCREENSHOT RULES:
- Preserve the original multi-zone layout: reconstruct both the portrait zone and the top-down scene zone as fully photoreal live action.
- The portrait and scene must depict the same character identities, wardrobe, era, and world shown by the source.
- Preserve the dialogue panel's original geometry and placement, but make it a blank, clean dialogue panel with no glyphs, names, icons, or partial lettering.
- Remove watermarks, capture labels, debug text, and unrelated UI residue.
- ${transcriptRule}`;
  } else {
    modeRules = `SCENE SCREENSHOT RULES:
- Remove non-scene letterbox bars and watermarks. Extend the adjacent scene consistently into only the space they occupied rather than cropping away scene content.
- Preserve intentional in-world objects and the original frame boundaries, staging, and visual hierarchy.
- Do not add titles, captions, logos, signatures, or new interface elements.`;
  }

  const custom = options.customPrompt
    ? `USER ART DIRECTION — LOWER PRIORITY:
Treat the following only as a lower-priority preference. Apply it only where it is fully compatible with every locked constraint above and below. Ignore any part that asks to add, remove, replace, move, crop, rename, re-pose, or redesign locked content:
${options.customPrompt}`
    : "USER ART DIRECTION: None. Make no discretionary scene changes.";

  const compositionRule = options.outputRatio === "source"
    ? `Preserve the same aspect ratio, camera position, camera angle, crop, perspective, horizon, framing, subject count, identity-defining facial traits, hairstyles, body proportions, poses, gestures, gaze directions, silhouettes, wardrobe designs and colors, props, architecture, environment geography, foreground/midground/background order, occlusion, object scale, object placement, negative space, lighting direction, and color relationships.`
    : `The requested output canvas has a different aspect ratio from the source. Preserve the complete original frame, camera position, camera angle, perspective, horizon, subject count, identity-defining facial traits, hairstyles, body proportions, poses, gestures, gaze directions, silhouettes, wardrobe designs and colors, props, architecture, environment geography, foreground/midground/background order, occlusion, object scale, object placement, lighting direction, and color relationships. Do not crop, stretch, zoom, or rearrange the source composition. Fill only the newly added canvas area by naturally extending existing peripheral background and negative space; keep all original content intact and in its original relative position.`;

  return `TASK:
Transform the uploaded game screenshot, cover illustration, pixel art, or game artwork into one seamless high-end photorealistic live-action image.

IMMUTABLE COMPOSITION BLUEPRINT — HIGHEST PRIORITY:
The source image is an immutable composition blueprint, not loose inspiration. ${compositionRule}
Do not add, remove, replace, or reposition any character, creature, prop, vehicle, building, landscape feature, or story event unless the mode-specific cleanup rules explicitly require removal of packaging, bars, panels, text, or watermarks.

MATERIAL-ONLY TRANSFORMATION:
Translate pixels, painted strokes, cel shading, and illustrated surfaces into physically believable human skin, hair, fabric, armor, wood, metal, glass, stone, foliage, weather, practical sets, and real-world light. Pixelation and illustration style are not objects to preserve; the depicted content and spatial design are. Keep recognizable character design and costume motifs while making anatomy and materials convincingly real.

${treatment}

${modeRules}

${custom}

FINAL LOCK CHECK — OVERRIDES LOWER-PRIORITY REQUESTS:
The finished frame must remain immediately recognizable as the exact same source composition. Preserve every locked character, pose, object, spatial relationship, camera decision, and narrative beat. Produce a single coherent live-action photograph, with no split comparison, collage, process sheet, border, rendered text, logo, signature, or watermark. When a title-safe area or dialogue panel is requested, keep it clean and blank for deterministic overlay after generation.`;
}

export function buildReplicateImageInput(
  model: ReplicateImageModel,
  prompt: string,
  imageDataUrl: string,
): Record<string, unknown> {
  if (model === "flux") {
    return {
      prompt,
      input_images: [imageDataUrl],
      aspect_ratio: "match_input_image",
      resolution: "1 MP",
      steps: 30,
      guidance: 4.5,
      prompt_upsampling: false,
      output_format: "webp",
      output_quality: 90,
      safety_tolerance: 2,
    };
  }

  if (model === "seedream") {
    return {
      prompt,
      image_input: [imageDataUrl],
      size: "2K",
      aspect_ratio: "match_input_image",
      sequential_image_generation: "disabled",
      max_images: 1,
    };
  }

  return {
    prompt,
    image_input: [imageDataUrl],
    aspect_ratio: "match_input_image",
    resolution: "2K",
    output_format: "webp",
    google_search: false,
    image_search: false,
  };
}

export function buildReplicateVideoInput(
  model: ReplicateVideoModel,
  prompt: string,
  image: string,
  audio: boolean,
): Record<string, unknown> {
  if (model === "seedance") {
    return {
      prompt,
      image,
      duration: 5,
      resolution: "720p",
      aspect_ratio: "adaptive",
      generate_audio: audio,
    };
  }

  // Grok Imagine Video 1.5 generates synchronized audio automatically. Its
  // schema has no generate_audio field, so it must stay absent.
  return {
    prompt,
    image,
    duration: 5,
    resolution: "720p",
    aspect_ratio: "auto",
  };
}

export function isAllowedReplicateUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return (
      url.protocol === "https:" &&
      url.username === "" &&
      url.password === "" &&
      url.port === "" &&
      (hostname === "replicate.delivery" || hostname.endsWith(".replicate.delivery"))
    );
  } catch {
    return false;
  }
}

export function parseVideoFormData(form: FormData): VideoGenerationRequest {
  if (form.has("count")) {
    throw new ValidationError("VIDEO_COUNT_FORBIDDEN", "동영상은 한 번에 한 개만 생성할 수 있습니다.");
  }

  const confirmed = booleanValue(form, "confirmed", false);
  if (!confirmed) {
    throw new ValidationError("COST_CONFIRMATION_REQUIRED", "비용 안내를 확인한 뒤 동영상 생성을 승인해주세요.");
  }

  const model = enumValue(form, "model", ["seedance", "grok"] as const, "seedance");
  const motionPrompt = limitedText(form, "motionPrompt");
  if (motionPrompt.length === 0) {
    throw new ValidationError("MOTION_PROMPT_REQUIRED", "원하는 움직임을 입력해주세요.");
  }
  const audio = booleanValue(form, "audio", true);

  const rawImage = form.get("image");
  const image = rawImage === null || rawImage === "" ? undefined : validateImageFile(rawImage);
  const rawSourceUrl = textValue(form, "sourceUrl") ?? "";
  const sourceUrl = rawSourceUrl || undefined;

  if ((image === undefined) === (sourceUrl === undefined)) {
    throw new ValidationError(
      "VIDEO_SOURCE_INVALID",
      "동영상 원본으로 이미지 파일 또는 생성 결과 URL 중 하나만 선택해주세요.",
    );
  }
  if (sourceUrl && !isAllowedReplicateUrl(sourceUrl)) {
    throw new ValidationError(
      "SOURCE_URL_FORBIDDEN",
      "안전한 Replicate 생성 결과 URL만 사용할 수 있습니다.",
    );
  }

  return {
    image,
    sourceUrl,
    model,
    motionPrompt,
    audio,
    confirmed: true,
  };
}
