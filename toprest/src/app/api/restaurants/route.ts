import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const random = searchParams.get("random") === "true";
  const category = searchParams.get("category");

  if (random) {
    let query = supabase.from("restaurants").select("*");
    if (category && category !== "전체") {
      query = query.eq("category", category);
    }
    const { data: all, error: countErr } = await query;
    if (countErr || !all || all.length === 0) {
      return NextResponse.json({ error: "데이터 없음" }, { status: 404 });
    }
    const picked = all[Math.floor(Math.random() * all.length)];
    return NextResponse.json(picked);
  }

  let query = supabase.from("restaurants").select("*").order("name");
  if (category && category !== "전체") {
    query = query.eq("category", category);
  }
  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, category, recommender, location, genre, notes, link, payco, verified, verifiers, review, solo_possible } = body;

  if (!name) {
    return NextResponse.json({ error: "가게 이름은 필수입니다" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("restaurants")
    .insert([{ name, category, recommender, location, genre, notes, link, payco, verified: verified ?? false, verifiers, review, solo_possible }])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
