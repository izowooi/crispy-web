/**
 * WiFi QR R2 Uploader Worker
 *
 * Next.js API로부터 HMAC 서명된 요청을 받아 R2에 파일을 업로드합니다.
 * R2 API 키는 이 Worker에만 저장되어 프론트엔드에 노출되지 않습니다.
 */

interface Env {
  QR_BUCKET: R2Bucket;
  WORKER_SECRET: string;
  ENVIRONMENT: string;
}

interface UploadResponse {
  success: boolean;
  objectKey?: string;
  error?: string;
}

/**
 * HMAC-SHA256 서명 검증
 */
async function verifySignature(
  timestamp: string,
  body: ArrayBuffer,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );

  // timestamp + body를 결합하여 서명 생성
  const data = new Uint8Array([
    ...encoder.encode(timestamp),
    ...new Uint8Array(body),
  ]);

  const expectedSignature = await crypto.subtle.sign("HMAC", key, data);
  const expectedHex = Array.from(new Uint8Array(expectedSignature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return signature === expectedHex;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS 헤더
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Signature, X-Timestamp, X-Object-Key",
    };

    // OPTIONS 요청 처리 (CORS preflight)
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // POST만 허용
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    try {
      // 인증 헤더 확인
      const signature = request.headers.get("X-Signature");
      const timestamp = request.headers.get("X-Timestamp");
      const objectKey = request.headers.get("X-Object-Key");

      if (!signature || !timestamp) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Missing authentication headers",
          }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (!objectKey) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing object key" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // 타임스탬프 검증 (5분 이내)
      const now = Date.now();
      const requestTime = parseInt(timestamp, 10);
      if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
        return new Response(
          JSON.stringify({ success: false, error: "Request expired" }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // 요청 본문 읽기
      const body = await request.arrayBuffer();

      // 서명 검증
      const isValid = await verifySignature(
        timestamp,
        body,
        signature,
        env.WORKER_SECRET
      );

      if (!isValid) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid signature" }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // R2에 업로드
      await env.QR_BUCKET.put(objectKey, body, {
        httpMetadata: {
          contentType: "image/webp",
        },
      });

      const response: UploadResponse = {
        success: true,
        objectKey,
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Upload error:", error);

      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Internal server error",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  },
};
