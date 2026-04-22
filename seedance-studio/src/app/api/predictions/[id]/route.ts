import { NextResponse } from "next/server";
import { getReplicateClient } from "@/lib/replicate";

export const runtime = "edge";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "예측 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const prediction = await getReplicateClient().predictions.get(id);

    return NextResponse.json({
      id: prediction.id,
      status: prediction.status,
      output: prediction.output,
      error: prediction.error,
    });
  } catch (error) {
    console.error("Prediction fetch error:", error);
    return NextResponse.json(
      { error: "예측 상태를 가져오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
