import {
  outputSize,
  providerSize,
  googleImageSize,
  type ModelId,
  type ResolutionMode,
} from "./images.ts";
// GPT Image 2.6 publishes no token table. Measured usage (medium, default complexity)
// equals the official GPT Image 2.5 calculator (24-patch long edge) × 3.3, rounded up.
// https://developers.openai.com/api/docs/guides/image-generation
export function openaiOutputTokens(width: number, height: number) {
  const ratio = Math.max(width, height) / Math.min(width, height),
    short = 24 / ratio,
    floor = Math.floor(short);
  const rounded =
    short - floor === 0.5 ? floor + (floor % 2) : Math.round(short);
  const base = Math.ceil(
    (24 * rounded * (2_000_000 + width * height)) / 4_000_000,
  );
  return Math.ceil((base * 33) / 10);
}
/** Image output only. Input tokens, thinking, retries and taxes are excluded. Rates checked 2026-11-06. */
export function estimateOutput(
  width: number,
  height: number,
  model: ModelId,
  resolution: ResolutionMode = "1k",
) {
  const output = outputSize(width, height, resolution);
  const [w, h] = providerSize(output.width, output.height)
    .split("x")
    .map(Number);
  const tokens =
    model === "banana"
      ? googleImageSize(width, height, resolution) === "2K"
        ? 1680
        : 1120
      : openaiOutputTokens(w, h);
  return { tokens, usd: (tokens * 30) / 1_000_000 };
}
