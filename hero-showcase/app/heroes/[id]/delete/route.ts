import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { decodeSession, SESSION_COOKIE, isAdmin } from "@/lib/session";
import type { Hero } from "@/lib/types";

export const dynamic = "force-dynamic";

function extractStoragePath(publicUrl: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx < 0) return null;
  return decodeURIComponent(publicUrl.slice(idx + marker.length));
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const origin = new URL(request.url).origin;

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await decodeSession(token) : null;
  if (!isAdmin(user)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: hero } = await supabase
    .from("hs_heroes")
    .select("*")
    .eq("id", id)
    .single();

  if (!hero) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const h = hero as Hero;

  if (h.portrait_url) {
    const path = extractStoragePath(h.portrait_url, "hs-portraits");
    if (path) await supabase.storage.from("hs-portraits").remove([path]);
  }

  const cardPath = extractStoragePath(h.card_url, "hs-cards");
  if (cardPath) await supabase.storage.from("hs-cards").remove([cardPath]);

  await supabase.from("hs_heroes").delete().eq("id", id);

  return NextResponse.redirect(`${origin}/`);
}
