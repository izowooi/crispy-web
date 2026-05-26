import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { OrderItemDetail } from "./types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

let cached: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (cached) return cached;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      "Supabase 환경변수가 설정되지 않았습니다. .env.local에 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY를 설정하세요."
    );
  }
  cached = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  });
  return cached;
}

const PAGE_SIZE = 1000;

export async function fetchAllOrderItemDetails(): Promise<OrderItemDetail[]> {
  const client = getSupabaseClient();
  const all: OrderItemDetail[] = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await client
      .from("cp_order_item_details")
      .select("*")
      .order("order_datetime", { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(`Supabase 조회 실패: ${error.message}`);
    }
    if (!data || data.length === 0) break;

    all.push(...(data as OrderItemDetail[]));

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}
