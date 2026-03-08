import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export const runtime = 'edge';
export const maxDuration = 120;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}

const STYLE_PROMPTS: Record<string, string> = {
  realistic_cinematic: "photorealistic cinematic",
  animated_cinematic: "animated cinematic",
  webtoon: "Korean webtoon style",
  watercolor: "watercolor illustration",
  "3d_cgi": "3D CGI rendering",
};

async function generateOne(
  ai: GoogleGenAI,
  prompt: string,
  characterParts: { inlineData: { mimeType: string; data: string } }[],
  callIndex: number
) {
  console.log(`[generate#${callIndex}] Gemini 호출 시작`);

  let response;
  try {
    response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: [
        { text: prompt },
        ...characterParts,
      ],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    });
  } catch (apiErr) {
    const msg = apiErr instanceof Error ? apiErr.message : JSON.stringify(apiErr);
    console.error(`[generate#${callIndex}] Gemini API 호출 실패:`, msg);
    throw new Error(`Gemini API 오류 (#${callIndex}): ${msg}`);
  }

  console.log(`[generate#${callIndex}] 응답 수신 - promptFeedback=${JSON.stringify(response.promptFeedback)}, candidates=${response.candidates?.length}`);

  if (response.promptFeedback?.blockReason) {
    const reason = response.promptFeedback.blockReason;
    console.error(`[generate#${callIndex}] 입력 안전 필터 차단: ${reason}`);
    throw new Error(`안전 필터 차단: ${reason}`);
  }

  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) {
    console.error(`[generate#${callIndex}] candidates 없음`);
    throw new Error("모델이 응답을 생성하지 못했습니다.");
  }

  const finishReason = candidates[0].finishReason;
  console.log(`[generate#${callIndex}] finishReason=${finishReason}`);

  if (finishReason === "SAFETY") {
    console.error(`[generate#${callIndex}] 출력 안전 필터 차단`);
    throw new Error("출력 콘텐츠가 안전 필터에 의해 차단되었습니다.");
  }

  const parts = candidates[0].content?.parts ?? [];
  console.log(`[generate#${callIndex}] parts 수=${parts.length}, types=${parts.map(p => p.text ? "text" : p.inlineData ? "image" : "other").join(",")}`);

  const imagePart = parts.find(
    (p) => p.inlineData?.data && p.inlineData.mimeType?.startsWith("image/")
  );

  if (!imagePart?.inlineData) {
    const textPart = parts.find((p) => p.text);
    const detail = textPart?.text
      ? `모델 텍스트 응답: ${textPart.text.slice(0, 300)}`
      : "이미지 파트 없음";
    console.error(`[generate#${callIndex}] 이미지 없음 — ${detail}`);
    throw new Error(`이미지 생성 실패 (#${callIndex}): ${detail}`);
  }

  console.log(`[generate#${callIndex}] 성공 - mimeType=${imagePart.inlineData.mimeType}, dataLen=${imagePart.inlineData.data!.length}`);
  return {
    base64: imagePart.inlineData.data!,
    mimeType: imagePart.inlineData.mimeType!,
  };
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
    const storyline = formData.get("storyline") as string;
    const style = formData.get("style") as string;
    const characterFiles = formData.getAll("characters[]") as File[];

    if (!storyline?.trim()) {
      return NextResponse.json({ error: "스토리라인을 입력해주세요." }, { status: 400 });
    }
    if (characterFiles.length === 0) {
      return NextResponse.json({ error: "캐릭터 시트를 최소 1장 업로드해주세요." }, { status: 400 });
    }

    const customStyleText = formData.get("customStyleText") as string | null;
    const stylePrompt =
      style === "custom" && customStyleText?.trim()
        ? customStyleText.trim()
        : (STYLE_PROMPTS[style] ?? STYLE_PROMPTS["realistic_cinematic"]);

    const prompt = `Create a 3x3 ${stylePrompt} sequence as a single landscape image.
The image must have 3 columns and 3 rows of cinematic panels showing a continuous story.
Story: ${storyline}
Use the attached character sheet(s) as reference for character appearance. Keep characters consistent across all 9 panels.
Output as a single wide landscape image (wider than tall) with clear panel divisions.`;

    // 캐릭터 이미지를 base64로 변환
    const characterParts = await Promise.all(
      characterFiles.map(async (file) => {
        const bytes = await file.arrayBuffer();
        const base64 = arrayBufferToBase64(bytes);
        return {
          inlineData: {
            mimeType: file.type,
            data: base64,
          },
        };
      })
    );

    console.log(
      `[generate] style=${style}, stylePrompt="${stylePrompt}", storyline length=${storyline.length}, characters=${characterFiles.length}`
    );
    console.log(`[generate] prompt 미리보기: ${prompt.slice(0, 120)}...`);

    // 4장 병렬 생성 (allSettled로 개별 실패 추적)
    const ai = new GoogleGenAI({ apiKey });
    const settled = await Promise.allSettled([
      generateOne(ai, prompt, characterParts, 1),
      generateOne(ai, prompt, characterParts, 2),
      generateOne(ai, prompt, characterParts, 3),
      generateOne(ai, prompt, characterParts, 4),
    ]);

    const results = [];
    const errors = [];
    for (const result of settled) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        const msg = result.reason instanceof Error ? result.reason.message : String(result.reason);
        errors.push(msg);
        console.error(`[generate] 개별 실패:`, msg);
      }
    }

    console.log(`[generate] 완료: 성공=${results.length}, 실패=${errors.length}`);

    if (results.length === 0) {
      return NextResponse.json(
        { error: `모든 이미지 생성 실패:\n${errors.join("\n")}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ images: results, errors: errors.length > 0 ? errors : undefined });
  } catch (err) {
    console.error("[generate] 예외:", err);
    const message = err instanceof Error ? err.message : JSON.stringify(err);
    return NextResponse.json({ error: `생성 오류: ${message}` }, { status: 500 });
  }
}
