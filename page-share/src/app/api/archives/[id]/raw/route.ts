export const runtime = "edge";

// Legacy local-filesystem route — not available on Cloudflare Pages.
// All archives now use R2 direct URLs (storage_path is an absolute https URL).
export async function GET() {
  return new Response("Gone: this archive was stored locally and is no longer accessible.", {
    status: 410,
    headers: { "Content-Type": "text/plain" },
  });
}
