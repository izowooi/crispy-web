import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/admin";

export const runtime = "edge";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const admin = isAdminRequest(request);
  const supabase = createServerClient();

  let query = supabase
    .from("ps_archives")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null);

  if (!admin) {
    query = query.eq("is_private", false);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ archive: data });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();
  const { error } = await supabase
    .from("ps_archives")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let body: { is_private?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.is_private !== "boolean") {
    return NextResponse.json({ error: "is_private (boolean) required" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { error } = await supabase
    .from("ps_archives")
    .update({ is_private: body.is_private })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
