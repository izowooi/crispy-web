import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

export const runtime = 'edge';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(request: NextRequest) {
  if (!process.env.REPLICATE_API_TOKEN) {
    return NextResponse.json({ error: "REPLICATE_API_TOKEN not configured" }, { status: 500 });
  }

  try {
    const { image, prompt } = await request.json();

    if (!image) {
      return NextResponse.json({ error: "이미지를 업로드하세요" }, { status: 400 });
    }

    const upscalePrompt =
      prompt?.trim() ||
      "Upscale this image to maximum resolution. Preserve all existing details, textures, colors, and composition exactly as they are. Enhance sharpness and clarity.";

    const output = await replicate.run("openai/gpt-image-2", {
      input: {
        prompt: upscalePrompt,
        input_images: [image],
        quality: "high",
        output_format: "webp",
        aspect_ratio: "1:1",
      },
    });

    const images = output as string[];
    return NextResponse.json({ image: images[0] });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
