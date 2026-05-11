/**
 * uploadProcessor — 클라이언트측 이미지 검증 + EXIF 제거 (canvas 재인코딩).
 *
 * 분리 이유: jsdom에서 `<canvas>` toDataURL / Image.onload가 완전하지 않으므로
 * 검증 로직(validateFile)은 순수 함수로 단위 테스트하고, 컴포넌트 테스트에서는
 * processImage 전체를 mock한다. (advisor 권고)
 */

export type ImageMeta = {
  width: number;
  height: number;
  sizeBytes: number;
  type: string;
};

export type ProcessedImage = {
  dataUrl: string;
  meta: ImageMeta;
};

export type ValidationResult =
  | { ok: true }
  | { ok: false; message: string };

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const DEFAULT_MAX_DIM = 2048;

export const ERROR_MESSAGES = {
  unsupportedType:
    "지원하지 않는 파일 형식입니다. JPG/PNG/WEBP만 업로드 가능합니다.",
  tooLarge: "파일이 너무 큽니다. 10MB 이하의 이미지를 사용해주세요.",
  decodeFailed: "이미지를 읽을 수 없습니다. 다른 사진을 시도해주세요.",
  canvasFailed: "이미지를 처리할 수 없습니다.",
} as const;

/**
 * 파일의 MIME 타입과 크기를 검증한다. MIME을 먼저 검사하므로
 * 잘못된 형식이면서 동시에 너무 큰 파일도 형식 오류로 응답한다.
 */
export function validateFile(
  file: File,
  maxSizeBytes: number,
): ValidationResult {
  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return { ok: false, message: ERROR_MESSAGES.unsupportedType };
  }
  if (file.size > maxSizeBytes) {
    return { ok: false, message: ERROR_MESSAGES.tooLarge };
  }
  return { ok: true };
}

/**
 * 비율 유지 다운스케일 치수 계산. 최대 변이 maxDim 이하가 되도록.
 */
export function computeDownscaledSize(
  width: number,
  height: number,
  maxDim: number,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width, height };
  const longest = Math.max(width, height);
  if (longest <= maxDim) return { width, height };
  const ratio = maxDim / longest;
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

/**
 * File → base64 dataURL (EXIF 제거된 webp).
 *
 * 1. FileReader로 dataURL 로드
 * 2. <img>에 그려 디코드
 * 3. <canvas>에 (다운스케일 후) drawImage
 * 4. canvas.toDataURL('image/webp', 0.9)로 재인코딩 → EXIF 자동 소실
 */
export async function processImage(
  file: File,
  maxDim: number = DEFAULT_MAX_DIM,
): Promise<ProcessedImage> {
  const dataUrl = await readAsDataUrl(file);
  const img = await loadImage(dataUrl);
  const { width, height } = computeDownscaledSize(
    img.naturalWidth,
    img.naturalHeight,
    maxDim,
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error(ERROR_MESSAGES.canvasFailed);
  }
  ctx.drawImage(img, 0, 0, width, height);

  const outDataUrl = canvas.toDataURL("image/webp", 0.9);
  const sizeBytes = approximateBase64Size(outDataUrl);

  return {
    dataUrl: outDataUrl,
    meta: {
      width,
      height,
      sizeBytes,
      type: "image/webp",
    },
  };
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
      } else {
        reject(new Error(ERROR_MESSAGES.decodeFailed));
      }
    };
    reader.onerror = () => reject(new Error(ERROR_MESSAGES.decodeFailed));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(ERROR_MESSAGES.decodeFailed));
    img.src = dataUrl;
  });
}

/**
 * base64 dataURL의 디코딩된 바이트 크기 근사값.
 * "data:image/webp;base64,XXXX..." 형식에서 페이로드 길이로 계산.
 */
function approximateBase64Size(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(",");
  if (commaIdx === -1) return dataUrl.length;
  const payload = dataUrl.slice(commaIdx + 1);
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  return Math.floor((payload.length * 3) / 4) - padding;
}
