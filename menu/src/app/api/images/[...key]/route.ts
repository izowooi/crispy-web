import { getEnv } from "@/lib/server/env";

export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const objectKey = key.map(decodeURIComponent).join("/");
  if (!objectKey.startsWith("daycares/") || objectKey.includes("..")) return new Response("Not found", { status: 404 });

  const env = await getEnv();
  const object = await env.IMAGES.get(objectKey);
  if (!object) return new Response("Not found", { status: 404 });

  return new Response(object.body as unknown as ReadableStream, {
    headers: {
      "content-type": object.httpMetadata?.contentType ?? "image/jpeg",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
