import { buildManifest, MANIFEST_HEADERS } from "@/lib/pwa";

export function GET() {
  return new Response(JSON.stringify(buildManifest()), { headers: MANIFEST_HEADERS });
}
