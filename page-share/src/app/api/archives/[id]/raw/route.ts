import { createServerClient } from "@/lib/supabase";
import { LocalAdapter } from "@/lib/storage/local-adapter";

// Node.js runtime: reads HTML from local filesystem.
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Validate that the archive exists
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("ps_archives")
    .select("id")
    .eq("id", id)
    .single();

  if (error || !data) {
    return new Response("Not found", { status: 404 });
  }

  const storage = new LocalAdapter();
  let html: string;
  try {
    html = await storage.read(id);
  } catch {
    return new Response("Archive file not found", { status: 404 });
  }

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Prevent the served HTML from running scripts when loaded directly
      "Content-Security-Policy":
        "default-src 'none'; img-src * data:; style-src 'unsafe-inline'; font-src *;",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
