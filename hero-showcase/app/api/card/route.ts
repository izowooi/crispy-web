import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const cardUrl = request.nextUrl.searchParams.get("url");
  if (!cardUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  // Only allow requests to our Supabase storage
  if (!cardUrl.includes("supabase.co")) {
    return new NextResponse("URL not allowed", { status: 403 });
  }

  const res = await fetch(cardUrl);
  if (!res.ok) {
    return new NextResponse("Failed to fetch card", { status: res.status });
  }

  const html = await res.text();

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
