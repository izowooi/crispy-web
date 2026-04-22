import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(request: NextRequest) {
  if (!process.env.REPLICATE_API_TOKEN) {
    return NextResponse.json({ error: "REPLICATE_API_TOKEN not configured" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const {
      prompt,
      aspect_ratio = "1:1",
      quality = "auto",
      number_of_images = 1,
      output_format = "webp",
      background = "auto",
    } = body;

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "프롬프트를 입력하세요" }, { status: 400 });
    }

    const output = await replicate.run("openai/gpt-image-2", {
      input: {
        prompt,
        aspect_ratio,
        quality,
        number_of_images: Math.min(4, Math.max(1, Number(number_of_images))),
        output_format,
        background,
      },
    });

    return NextResponse.json({ images: output });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
