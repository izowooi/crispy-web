import QRCode from "qrcode";
import { generateWifiString, WifiQRData } from "./wifi-format";

export interface QRGenerateOptions {
  width?: number;
  margin?: number;
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
}

const defaultOptions: QRGenerateOptions = {
  width: 300,
  margin: 2,
  errorCorrectionLevel: "M",
};

/**
 * WiFi QR 코드를 Data URL (PNG)로 생성
 */
export async function generateQRDataURL(
  wifiData: WifiQRData,
  options: QRGenerateOptions = {}
): Promise<string> {
  const wifiString = generateWifiString(wifiData);
  const mergedOptions = { ...defaultOptions, ...options };

  const dataUrl = await QRCode.toDataURL(wifiString, {
    width: mergedOptions.width,
    margin: mergedOptions.margin,
    errorCorrectionLevel: mergedOptions.errorCorrectionLevel,
  });

  return dataUrl;
}

/**
 * WiFi QR 코드를 Canvas에 렌더링
 */
export async function generateQRToCanvas(
  canvas: HTMLCanvasElement,
  wifiData: WifiQRData,
  options: QRGenerateOptions = {}
): Promise<void> {
  const wifiString = generateWifiString(wifiData);
  const mergedOptions = { ...defaultOptions, ...options };

  await QRCode.toCanvas(canvas, wifiString, {
    width: mergedOptions.width,
    margin: mergedOptions.margin,
    errorCorrectionLevel: mergedOptions.errorCorrectionLevel,
  });
}

/**
 * Data URL을 Blob으로 변환
 */
export function dataURLtoBlob(dataURL: string): Blob {
  const arr = dataURL.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new Blob([u8arr], { type: mime });
}

/**
 * Canvas를 WebP Blob으로 변환
 */
export function canvasToWebPBlob(
  canvas: HTMLCanvasElement,
  quality: number = 0.9
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("WebP 변환 실패"));
        }
      },
      "image/webp",
      quality
    );
  });
}

/**
 * QR 코드를 WebP Blob으로 생성
 */
export async function generateQRAsWebP(
  wifiData: WifiQRData,
  options: QRGenerateOptions = {}
): Promise<Blob> {
  // Canvas 생성
  const canvas = document.createElement("canvas");
  await generateQRToCanvas(canvas, wifiData, options);

  // WebP로 변환
  return canvasToWebPBlob(canvas);
}
