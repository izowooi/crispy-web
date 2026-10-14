import { buildManifest, MANIFEST_HEADERS } from "@/lib/pwa";
import { getDaycare } from "@/lib/server/db";
import { getEnv } from "@/lib/server/env";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const daycare = await getDaycare(await getEnv(), id);
  if (!daycare) return new Response("Not found", { status: 404 });
  return new Response(JSON.stringify(buildManifest({ id: daycare.id, name: daycare.name })), {
    headers: MANIFEST_HEADERS,
  });
}
