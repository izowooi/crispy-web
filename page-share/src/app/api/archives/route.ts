import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/admin";
import { isValidApiKey, extractApiKey } from "@/lib/apikey";

export const runtime = "edge";

export async function GET(request: Request) {
  const admin = isAdminRequest(request);
  const supabase = createServerClient();

  let query = supabase
    .from("ps_archives")
    .select("id, title, original_url, file_size, created_at, is_private, deleted_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (!admin) {
    query = query.eq("is_private", false);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ archives: data ?? [], isAdmin: admin });
}

export async function POST(request: Request) {
  // API key guard: reject if API_KEY is configured and key is missing/wrong
  if (!isValidApiKey(extractApiKey(request))) {
    return NextResponse.json({ error: "Unauthorized: invalid or missing API key" }, { status: 401 });
  }

  // Allow Chrome extension origins
  const origin = request.headers.get("origin") ?? "";
  const isChromeExt = origin.startsWith("chrome-extension://");

  let body: {
    title?: string;
    original_url?: string;
    storage_path?: string;
    file_size?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { title, original_url, storage_path, file_size } = body;

  if (!title || !original_url) {
    return NextResponse.json({ error: "title and original_url are required" }, { status: 400 });
  }
  if (!storage_path) {
    return NextResponse.json({ error: "storage_path is required" }, { status: 400 });
  }
  if (!storage_path.startsWith("https://")) {
    return NextResponse.json({ error: "storage_path must be an absolute https URL" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("ps_archives")
    .insert({ id, title, original_url, storage_path, file_size: file_size ?? 0 })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:52741";
  const shareUrl = `${baseUrl}/archive/${id}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (isChromeExt) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type, X-Api-Key";
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
      "Access-Control-Allow-Headers": "Content-Type, X-Api-Key",
    },
  });
}
