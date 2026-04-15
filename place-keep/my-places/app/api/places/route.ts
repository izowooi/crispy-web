import { NextResponse } from "next/server";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { TITLE_MAX } from "@/types/place";

// Marker table name lives in one place so tests / scripts can reuse it.
const TABLE = "pk_places";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    // Graceful fallback: the UI can still render the map even without DB.
    return NextResponse.json({ places: [], unconfigured: true }, { status: 200 });
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ places: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Common cause: the migration SQL hasn't been run yet.
    return NextResponse.json(
      { places: [], error: message, missingTable: /pk_places/.test(message) },
      { status: 200 }
    );
  }
}

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = validateInput(body, { partial: false });
  if ("error" in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .insert(validation.value)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ place: data }, { status: 201 });
}

type ValidationResult =
  | { value: Record<string, unknown> }
  | { error: string };

export function validateInput(
  body: Record<string, unknown>,
  opts: { partial: boolean }
): ValidationResult {
  const out: Record<string, unknown> = {};

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || body.title.trim().length === 0) {
      return { error: "title is required" };
    }
    if (body.title.length > TITLE_MAX) {
      return { error: `title must be ≤ ${TITLE_MAX} characters` };
    }
    out.title = body.title;
  } else if (!opts.partial) {
    return { error: "title is required" };
  }

  for (const key of ["lat", "lng"] as const) {
    if (body[key] !== undefined) {
      const n = Number(body[key]);
      if (!Number.isFinite(n)) return { error: `${key} must be a number` };
      out[key] = n;
    } else if (!opts.partial) {
      return { error: `${key} is required` };
    }
  }

  for (const key of ["caption", "address", "place_name", "category", "visited_at", "photo_url"] as const) {
    if (body[key] !== undefined) {
      if (body[key] === null) {
        out[key] = null;
      } else if (typeof body[key] !== "string") {
        return { error: `${key} must be a string or null` };
      } else {
        out[key] = body[key];
      }
    }
  }

  // Force updated_at on writes
  out.updated_at = new Date().toISOString();

  return { value: out };
}

export { TABLE };
