import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { LocalAdapter } from "@/lib/storage/local-adapter";
import { sanitizeHtml } from "@/lib/sanitize";

// Node.js runtime: LocalAdapter needs filesystem access.
// Switch to edge + R2Adapter for Cloudflare Pages deployment.
export const runtime = "nodejs";

export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("ps_archives")
    .select("id, title, original_url, file_size, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ archives: data ?? [] });
}

export async function POST(request: Request) {
  // Allow Chrome extension origins
  const origin = request.headers.get("origin") ?? "";
  const isChromeExt = origin.startsWith("chrome-extension://");

  let body: { title?: string; original_url?: string; html?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { title, original_url, html } = body;
  if (!title || !original_url || !html) {
    return NextResponse.json(
      { error: "title, original_url, html are required" },
      { status: 400 },
    );
  }

  const sanitized = sanitizeHtml(html);
  const id = crypto.randomUUID();
  const storage = new LocalAdapter();
  const { storagePath, fileSize } = await storage.upload(id, sanitized);

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("ps_archives")
    .insert({ id, title, original_url, storage_path: storagePath, file_size: fileSize })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const shareUrl = `${baseUrl}/archive/${id}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (isChromeExt) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
  }

  return new NextResponse(JSON.stringify({ archive: data, share_url: shareUrl }), {
    status: 201,
    headers,
  });
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
