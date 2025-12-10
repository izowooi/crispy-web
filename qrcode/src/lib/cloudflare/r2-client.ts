import crypto from "crypto";

interface UploadResult {
  success: boolean;
  objectKey?: string;
  error?: string;
}

/**
 * HMAC-SHA256 서명 생성
 */
function createSignature(
  timestamp: string,
  body: ArrayBuffer,
  secret: string
): string {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(timestamp);
  hmac.update(Buffer.from(body));
  return hmac.digest("hex");
}

/**
 * Cloudflare Workers를 통해 R2에 파일 업로드
 */
export async function uploadToR2(
  fileBuffer: ArrayBuffer,
  objectKey: string
): Promise<UploadResult> {
  const workerUrl = process.env.CLOUDFLARE_WORKER_URL;
  const workerSecret = process.env.CLOUDFLARE_WORKER_SECRET;

  if (!workerUrl || !workerSecret) {
    return {
      success: false,
      error: "Cloudflare Worker 환경변수가 설정되지 않았습니다.",
    };
  }

  const timestamp = Date.now().toString();
  const signature = createSignature(timestamp, fileBuffer, workerSecret);

  try {
    const response = await fetch(`${workerUrl}/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Signature": signature,
        "X-Timestamp": timestamp,
        "X-Object-Key": objectKey,
      },
      body: fileBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `업로드 실패: ${response.status} ${errorText}`,
      };
    }

    const result = await response.json();
    return {
      success: true,
      objectKey: result.objectKey,
    };
  } catch (error) {
    return {
      success: false,
      error: `네트워크 오류: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
    };
  }
}

/**
 * QR 코드용 객체 키 생성
 */
export function generateObjectKey(userId: string): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `qr-codes/${userId}/${timestamp}-${randomSuffix}.webp`;
}
