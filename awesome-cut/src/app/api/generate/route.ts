import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;

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
  characterParts: { inlineData: { mimeType: string; data: string } }[]
) {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-image-preview",
    contents: [
      { text: prompt },
      ...characterParts,
    ],
    config: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  });

  if (response.promptFeedback?.blockReason) {
    throw new Error(`안전 필터 차단: ${response.promptFeedback.blockReason}`);
  }

  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error("모델이 응답을 생성하지 못했습니다.");
  }

  if (candidates[0].finishReason === "SAFETY") {
    throw new Error("출력 콘텐츠가 안전 필터에 의해 차단되었습니다.");
  }

  const parts = candidates[0].content?.parts ?? [];
  const imagePart = parts.find(
    (p) => p.inlineData?.data && p.inlineData.mimeType?.startsWith("image/")
  );

  if (!imagePart?.inlineData) {
    const textPart = parts.find((p) => p.text);
    throw new Error(
      textPart?.text
        ? `이미지 생성 실패 (모델 응답): ${textPart.text.slice(0, 200)}`
        : "생성된 이미지를 찾을 수 없습니다."
    );
  }

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

    const stylePrompt = STYLE_PROMPTS[style] ?? STYLE_PROMPTS["realistic_cinematic"];

    const prompt = `Create a 3x3 ${stylePrompt} sequence as a single landscape image.
The image must have 3 columns and 3 rows of cinematic panels showing a continuous story.
Story: ${storyline}
Use the attached character sheet(s) as reference for character appearance. Keep characters consistent across all 9 panels.
Output as a single wide landscape image (wider than tall) with clear panel divisions.`;

    // 캐릭터 이미지를 base64로 변환
    const characterParts = await Promise.all(
      characterFiles.map(async (file) => {
        const bytes = await file.arrayBuffer();
        const base64 = Buffer.from(bytes).toString("base64");
        return {
          inlineData: {
            mimeType: file.type,
            data: base64,
          },
        };
      })
    );

    console.log(
      `[generate] style=${style}, storyline length=${storyline.length}, characters=${characterFiles.length}`
    );

    // 4장 병렬 생성
    const ai = new GoogleGenAI({ apiKey });
    const results = await Promise.all([
      generateOne(ai, prompt, characterParts),
      generateOne(ai, prompt, characterParts),
      generateOne(ai, prompt, characterParts),
      generateOne(ai, prompt, characterParts),
    ]);

    console.log(`[generate] success: ${results.length} images`);

    return NextResponse.json({ images: results });
  } catch (err) {
    console.error("[generate] Error:", err);
    const message = err instanceof Error ? err.message : JSON.stringify(err);
    return NextResponse.json({ error: `생성 오류: ${message}` }, { status: 500 });
  }
}
