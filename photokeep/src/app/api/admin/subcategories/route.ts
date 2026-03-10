import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyJwt, COOKIE_NAME } from '@/lib/auth/jwt';

export const runtime = 'edge';

async function auth(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyJwt(token);
}

export async function POST(request: NextRequest) {
  const user = await auth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { category_id, name } = await request.json() as { category_id: string; name: string };
  if (!category_id || !name?.trim()) {
    return NextResponse.json({ error: 'category_id and name are required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('subcategories')
    .insert({ category_id, name: name.trim() })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ subcategory: data }, { status: 201 });
}
