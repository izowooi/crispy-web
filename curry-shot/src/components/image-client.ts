import type { OverlayConfig } from "./studio-types";

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    return "JPG, PNG, WebP 이미지만 사용할 수 있어요.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "이미지는 10MB 이하로 준비해 주세요.";
  }
  return null;
}

export async function getImageDimensions(file: Blob): Promise<{ width: number; height: number }> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadHtmlImage(objectUrl);
    return { width: image.naturalWidth, height: image.naturalHeight };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
    image.src = src;
  });
}

type RenderImageOptions = {
  proxyUrl?: string;
  accessCode?: string;
};

async function imageFromBlob(blob: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") return createImageBitmap(blob);

  const objectUrl = URL.createObjectURL(blob);
  try {
    return await loadHtmlImage(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function fetchRenderableImage(
  src: string,
  headers?: Record<string, string>,
): Promise<ImageBitmap | HTMLImageElement> {
  const response = await fetch(src, { headers });
  if (!response.ok) throw new Error("이미지 데이터를 가져오지 못했습니다.");
  return imageFromBlob(await response.blob());
}

async function loadRenderableImage(
  src: string,
  options: RenderImageOptions,
): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await fetchRenderableImage(src);
  } catch (directError) {
    if (!options.proxyUrl) throw directError;
    const accessCode = options.accessCode?.trim();
    return fetchRenderableImage(
      options.proxyUrl,
      accessCode ? { "x-curry-shot-access-code": accessCode } : undefined,
    );
  }
}

function sourceWidth(image: ImageBitmap | HTMLImageElement): number {
  return "naturalWidth" in image ? image.naturalWidth : image.width;
}

function sourceHeight(image: ImageBitmap | HTMLImageElement): number {
  return "naturalHeight" in image ? image.naturalHeight : image.height;
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) lines.push(current);
    current = word;

    if (context.measureText(current).width > maxWidth) {
      const characters = [...current];
      current = "";
      for (const character of characters) {
        const characterCandidate = `${current}${character}`;
        if (context.measureText(characterCandidate).width > maxWidth && current) {
          lines.push(current);
          current = character;
        } else {
          current = characterCandidate;
        }
      }
    }
  }
  if (current) lines.push(current);

  lines.slice(0, maxLines).forEach((line, index) => {
    const isTruncated = index === maxLines - 1 && lines.length > maxLines;
    context.fillText(isTruncated ? `${line.replace(/[.…]+$/, "")}…` : line, x, y + index * lineHeight);
  });
}

function drawOverlay(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  overlay: OverlayConfig,
) {
  const scale = Math.max(0.7, Math.min(width, height) / 900);

  if (overlay.title?.trim()) {
    const title = overlay.title.trim().slice(0, 100);
    const fontSize = Math.round(Math.min(width * 0.08, 68 * scale));
    context.save();
    context.textAlign = "center";
    context.textBaseline = "top";
    context.font = `600 ${fontSize}px Georgia, "Noto Serif KR", serif`;
    context.lineWidth = Math.max(3, fontSize * 0.09);
    context.strokeStyle = "rgba(16, 12, 8, 0.72)";
    context.fillStyle = "#fff8ea";
    context.shadowColor = "rgba(0, 0, 0, 0.44)";
    context.shadowBlur = 14 * scale;
    context.strokeText(title, width / 2, height * 0.065, width * 0.86);
    context.fillText(title, width / 2, height * 0.065, width * 0.86);
    context.restore();
  }

  if (overlay.dialogue?.trim()) {
    const panelX = width * 0.045;
    const panelY = height * 0.64;
    const panelWidth = width * 0.91;
    const panelHeight = height * 0.315;
    const radius = Math.max(10, Math.min(width, height) * 0.018);
    const paddingX = panelWidth * 0.045;

    context.save();
    context.beginPath();
    context.roundRect(panelX, panelY, panelWidth, panelHeight, radius);
    context.fillStyle = "rgba(8, 9, 10, 0.82)";
    context.fill();
    context.lineWidth = Math.max(1.5, 2 * scale);
    context.strokeStyle = "rgba(255, 246, 227, 0.76)";
    context.stroke();

    const speakerSize = Math.round(Math.max(14, Math.min(width * 0.028, 25 * scale)));
    const textSize = Math.round(Math.max(16, Math.min(width * 0.035, 32 * scale)));
    const textTop = panelY + panelHeight * 0.27;

    if (overlay.speaker?.trim()) {
      context.font = `700 ${speakerSize}px Inter, "Noto Sans KR", sans-serif`;
      context.fillStyle = "#eab15f";
      context.textAlign = "left";
      context.textBaseline = "top";
      context.fillText(overlay.speaker.trim().slice(0, 40), panelX + paddingX, panelY + panelHeight * 0.12);
    }

    context.font = `600 ${textSize}px Inter, "Noto Sans KR", sans-serif`;
    context.fillStyle = "#fffdf8";
    context.textAlign = "left";
    context.textBaseline = "top";
    context.shadowColor = "rgba(0, 0, 0, 0.65)";
    context.shadowBlur = 3 * scale;
    drawWrappedText(
      context,
      overlay.dialogue,
      panelX + paddingX,
      textTop,
      panelWidth - paddingX * 2,
      textSize * 1.35,
      3,
    );
    context.restore();
  }
}

export async function renderImageWithOverlay(
  src: string,
  overlay: OverlayConfig,
  options: RenderImageOptions = {},
): Promise<Blob> {
  const image = await loadRenderableImage(src, options);
  const width = sourceWidth(image);
  const height = sourceHeight(image);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("브라우저에서 결과를 합성하지 못했습니다.");

  context.drawImage(image, 0, 0, width, height);
  drawOverlay(context, width, height, overlay);

  if ("close" in image && typeof image.close === "function") image.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("결과 파일을 만들지 못했습니다."))),
      "image/webp",
      0.94,
    );
  });
}

export function safeDownloadName(sourceName: string, suffix = "live-action"): string {
  const base = sourceName.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9가-힣_-]+/g, "-").replace(/^-+|-+$/g, "");
  return `${base || "curry-shot"}-${suffix}.webp`;
}

export function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
