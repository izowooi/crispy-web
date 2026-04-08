import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyJwt, COOKIE_NAME } from '@/lib/auth/jwt';

export const runtime = 'edge';

export async function PATCH(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await verifyJwt(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { category_id, subcategory_id, is_private } = body as {
    category_id?: string;
    subcategory_id?: string;
    is_private: boolean;
  };

  if (typeof is_private !== 'boolean') {
    return NextResponse.json({ error: 'is_private required' }, { status: 400 });
  }
  if (!category_id && !subcategory_id) {
    return NextResponse.json({ error: 'category_id or subcategory_id required' }, { status: 400 });
  }

  const filterKey = subcategory_id ? 'subcategory_id' : 'category_id';
  const filterVal = (subcategory_id ?? category_id)!;

  const { data, error } = await supabaseAdmin
    .from('posts')
    .update({ is_private })
    .eq(filterKey, filterVal)
    .select('id');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, updated: data?.length ?? 0 });
}
