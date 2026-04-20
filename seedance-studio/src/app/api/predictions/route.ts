import { NextResponse } from "next/server";
import { replicate } from "@/lib/replicate";
import type { CreatePredictionRequest } from "@/lib/types";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const body: CreatePredictionRequest = await request.json();
    const { prompt, duration, resolution, aspect_ratio, generate_audio } = body;

    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: "프롬프트를 입력해주세요." },
        { status: 400 }
      );
    }

    const prediction = await replicate.predictions.create({
      model: "bytedance/seedance-2.0",
      input: {
        prompt,
        duration,
        resolution,
        aspect_ratio,
        generate_audio,
      },
    });

    return NextResponse.json(
      { id: prediction.id, status: prediction.status },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Prediction creation error:", error);

    const err = error as { response?: { status?: number } };
    let errorMessage = "비디오 생성 요청 중 오류가 발생했습니다.";
    if (err?.response?.status === 402) {
      errorMessage = "크레딧이 부족합니다. Replicate 계정을 확인해주세요.";
    } else if (err?.response?.status === 429) {
      errorMessage = "요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.";
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
