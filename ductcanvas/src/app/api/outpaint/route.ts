import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

export const runtime = 'edge';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const RATIO_MAP: Record<string, string> = {
  "3:2": "3:2",
  "2:3": "2:3",
  "custom-2:1": "3:2",
  "custom-1:2": "2:3",
};

function buildPrompt(direction: string, customPrompt: string): string {
  const base =
    direction === "horizontal"
      ? "Extend this image horizontally to fill the wider canvas. Seamlessly continue the scene on both sides, maintaining consistent lighting, style, colors, and atmosphere. The extension should be indistinguishable from the original."
      : "Extend this image vertically to fill the taller canvas. Seamlessly continue the scene above and below, maintaining consistent lighting, style, colors, and atmosphere. The extension should be indistinguishable from the original.";

  return customPrompt ? `${base} Additional details: ${customPrompt}` : base;
}

export async function POST(request: NextRequest) {
  if (!process.env.REPLICATE_API_TOKEN) {
    return NextResponse.json({ error: "REPLICATE_API_TOKEN not configured" }, { status: 500 });
  }

  try {
    const { image, direction = "horizontal", ratio = "3:2", custom_prompt = "" } = await request.json();

    if (!image) {
      return NextResponse.json({ error: "이미지를 업로드하세요" }, { status: 400 });
    }

    const aspectRatio = RATIO_MAP[ratio] ?? "3:2";
    const prompt = buildPrompt(direction, custom_prompt);

    const output = await replicate.run("openai/gpt-image-2", {
      input: {
        prompt,
        input_images: [image],
        aspect_ratio: aspectRatio,
        quality: "high",
        output_format: "webp",
      },
    });

    const images = output as string[];
    return NextResponse.json({ image: images[0] });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
