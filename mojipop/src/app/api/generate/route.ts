import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { CONCEPTS, DEFAULT_CONCEPT_IDS } from "@/lib/concepts";

export const runtime = "edge";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(request: NextRequest) {
  if (!process.env.REPLICATE_API_TOKEN) {
    return NextResponse.json(
      { error: "REPLICATE_API_TOKEN not configured" },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { images, quality = "low" } = body as {
    images?: unknown;
    quality?: string;
  };

  if (!Array.isArray(images) || images.length < 1 || images.length > 3) {
    return NextResponse.json(
      { error: "1~3개의 이미지를 업로드하세요" },
      { status: 400 }
    );
  }

  for (const img of images) {
    if (typeof img !== "string" || !img.startsWith("data:image/")) {
      return NextResponse.json(
        { error: "올바른 이미지 형식이 아닙니다" },
        { status: 400 }
      );
    }
  }

  const validQualities = ["low", "medium", "high"];
  const safeQuality = validQualities.includes(quality as string)
    ? quality
    : "low";

  const conceptMap = new Map(CONCEPTS.map((c) => [c.id, c]));
  const concepts = DEFAULT_CONCEPT_IDS.map((id) => conceptMap.get(id)).filter(
    Boolean
  );

  const settled = await Promise.allSettled(
    concepts.map(async (concept) => {
      const prediction = await replicate.predictions.create({
        model: "openai/gpt-image-2",
        input: {
          prompt: concept!.prompt,
          input_images: images as string[],
          quality: safeQuality,
          aspect_ratio: "1:1",
          output_format: "webp",
        },
      });
      return { conceptId: concept!.id, predictionId: prediction.id };
    })
  );

  const results = settled.map((result, i) => {
    const concept = concepts[i];
    if (result.status === "fulfilled") {
      return {
        conceptId: concept!.id,
        predictionId: result.value.predictionId,
      };
    } else {
      const msg =
        result.reason instanceof Error
          ? result.reason.message
          : "예측 생성 실패";
      return { conceptId: concept!.id, predictionId: null, error: msg };
    }
  });

  return NextResponse.json({ results });
}
