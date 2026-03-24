import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';
import { isAdmin } from '@/lib/auth/admin';

export const runtime = 'edge';

const LIMIT = 15;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10));
  const limit = Math.min(30, Math.max(1, parseInt(searchParams.get('limit') ?? String(LIMIT), 10)));

  const user = await getSession();
  const showPrivate = user ? isAdmin(user.email) : false;

  let query = supabaseAdmin
    .from('posts')
    .select('*, photos(*)')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (!showPrivate) {
    query = query.eq('is_private', false);
  }

  const { data: posts, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    posts: posts ?? [],
    hasMore: (posts ?? []).length === limit,
  });
}
