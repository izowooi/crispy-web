export const MODELS = [
  { id: "flare", label: "Flare", api: "gpt-image-2.6-flare" },
  { id: "sunburst", label: "Sunburst", api: "gpt-image-2.6-sunburst" },
  { id: "banana", label: "Nano Banana 2.1", api: "gemini-nano-banana-2.1" },
] as const;
export type ModelId = (typeof MODELS)[number]["id"];
export function targetSize(width: number, height: number) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1
  )
    throw new Error("Invalid dimensions");
  const scale = Math.min(1, 2048 / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
export type ResolutionMode = "original" | "1k" | "2k";
type ResolutionSetting = ResolutionMode | boolean;
export function outputSize(
  width: number,
  height: number,
  resolution: ResolutionSetting = "1k",
) {
  const bounded = targetSize(width, height);
  const minimum =
    resolution === "2k"
      ? 2048
      : resolution === "original" || resolution === false
        ? 0
        : 1024;
  const scale = Math.max(1, minimum / Math.max(bounded.width, bounded.height));
  return {
    width: Math.max(1, Math.round(bounded.width * scale)),
    height: Math.max(1, Math.round(bounded.height * scale)),
  };
}
export function googleImageSize(
  width: number,
  height: number,
  resolution: ResolutionSetting = "1k",
) {
  const size = outputSize(width, height, resolution);
  return Math.max(size.width, size.height) > 1024 ? "2K" : "1K";
}
export function generationPrompt(
  width: number,
  height: number,
  resolution: ResolutionSetting = "1k",
) {
  const size = outputSize(width, height, resolution);
  return (
    PROMPT +
    (Math.max(size.width, size.height) > Math.max(width, height)
      ? " The source is below the requested output resolution. Reconstruct crisp, plausible fine detail, natural skin and material textures at the requested resolution. Correct compression artifacts, blur and pixelation instead of reproducing them. Preserve the original framing and aspect ratio."
      : "")
  );
}
export function providerSize(width: number, height: number) {
  const ratio = Math.max(1 / 3, Math.min(3, width / height));
  const pixels = Math.max(655360, Math.min(4194304, width * height));
  return `${Math.ceil(Math.sqrt(pixels * ratio) / 16) * 16}x${Math.ceil(Math.sqrt(pixels / ratio) / 16) * 16}`;
}
export const PROMPT =
  "Transform this anime or video-game image into a convincing photorealistic live-action film still. Preserve the exact composition, camera angle, poses, character identities, clothing, objects, background, lighting direction and visible typography. Use realistic human anatomy, natural skin, detailed physical materials and cinematic light. Do not add borders, collages, extra characters or change the framing. Return one image only.";
