import { NextResponse } from "next/server";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { TABLE, validateInput } from "../route";

export const dynamic = "force-dynamic";

// Next.js 16: route handler params are async.
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const { id } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = validateInput(body, { partial: true });
  if ("error" in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  if (Object.keys(validation.value).length <= 1 /* only updated_at */) {
    return NextResponse.json({ error: "no updatable fields" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .update(validation.value)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ place: data });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const { id } = await ctx.params;
  const supabase = getSupabase();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return new NextResponse(null, { status: 204 });
}
