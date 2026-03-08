import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export const runtime = 'edge';
export const maxDuration = 60;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;

    if (!imageFile) {
      return NextResponse.json({ error: "이미지 파일이 없습니다." }, { status: 400 });
    }

    const bytes = await imageFile.arrayBuffer();
    const base64 = arrayBufferToBase64(bytes);

    const ai = new GoogleGenAI({ apiKey });

    console.log(`[upscale] size=${imageFile.size}, type=${imageFile.type}`);

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: [
        {
          text: "Upscale this image to 2K resolution (2048px wide). Enhance details, sharpness, and overall quality while preserving the original composition, style, and content exactly. Output a high-resolution version of the same image.",
        },
        {
          inlineData: {
            mimeType: imageFile.type,
            data: base64,
          },
        },
      ],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    });

    if (response.promptFeedback?.blockReason) {
      return NextResponse.json(
        { error: `안전 필터 차단: ${response.promptFeedback.blockReason}` },
        { status: 422 }
      );
    }

    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      return NextResponse.json({ error: "업스케일 실패: 모델 응답 없음" }, { status: 500 });
    }

    if (candidates[0].finishReason === "SAFETY") {
      return NextResponse.json(
        { error: "출력 콘텐츠가 안전 필터에 의해 차단되었습니다." },
        { status: 422 }
      );
    }

    const parts = candidates[0].content?.parts ?? [];
    const imagePart = parts.find(
      (p) => p.inlineData?.data && p.inlineData.mimeType?.startsWith("image/")
    );

    if (!imagePart?.inlineData) {
      const textPart = parts.find((p) => p.text);
      const msg = textPart?.text
        ? `업스케일 실패 (모델 응답): ${textPart.text.slice(0, 300)}`
        : "업스케일된 이미지를 찾을 수 없습니다.";
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const imageBuffer = base64ToUint8Array(imagePart.inlineData.data!);
    console.log(`[upscale] success: ${imageBuffer.byteLength} bytes`);

    return new Response(imageBuffer.buffer as ArrayBuffer, {
      headers: {
        "Content-Type": imagePart.inlineData.mimeType!,
        "Content-Disposition": "attachment; filename=upscaled_2k.png",
      },
    });
  } catch (err) {
    console.error("[upscale] Error:", err);
    const message = err instanceof Error ? err.message : JSON.stringify(err);
    return NextResponse.json({ error: `업스케일 오류: ${message}` }, { status: 500 });
  }
}
