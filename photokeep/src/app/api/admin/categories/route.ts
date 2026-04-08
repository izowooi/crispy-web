import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyJwt, COOKIE_NAME } from '@/lib/auth/jwt';

export const runtime = 'edge';

async function auth(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyJwt(token);
}

export async function GET(request: NextRequest) {
  const user = await auth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: categories, error } = await supabaseAdmin
    .from('categories')
    .select('*, subcategories(*)')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: postPrivacy } = await supabaseAdmin
    .from('posts')
    .select('category_id, subcategory_id, is_private');

  const byCategory: Record<string, { public: number; private: number }> = {};
  const bySubcategory: Record<string, { public: number; private: number }> = {};

  for (const p of postPrivacy ?? []) {
    if (p.category_id) {
      if (!byCategory[p.category_id]) byCategory[p.category_id] = { public: 0, private: 0 };
      if (p.is_private) { byCategory[p.category_id].private++; } else { byCategory[p.category_id].public++; }
    }
    if (p.subcategory_id) {
      if (!bySubcategory[p.subcategory_id]) bySubcategory[p.subcategory_id] = { public: 0, private: 0 };
      if (p.is_private) { bySubcategory[p.subcategory_id].private++; } else { bySubcategory[p.subcategory_id].public++; }
    }
  }

  return NextResponse.json({ categories, privacyCounts: { byCategory, bySubcategory } });
}

export async function POST(request: NextRequest) {
  const user = await auth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { name, category_id } = body as { name: string; category_id?: string };

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  if (category_id) {
    // Create subcategory
    const { data, error } = await supabaseAdmin
      .from('subcategories')
      .insert({ name: name.trim(), category_id })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ subcategory: data });
  } else {
    // Create category
    const { data, error } = await supabaseAdmin
      .from('categories')
      .insert({ name: name.trim() })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ category: data });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await auth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { id, name, type } = body as { id: string; name: string; type: 'category' | 'subcategory' };

  if (!id || !name?.trim() || !type) {
    return NextResponse.json({ error: 'id, name, type required' }, { status: 400 });
  }

  const table = type === 'subcategory' ? 'subcategories' : 'categories';
  const { error } = await supabaseAdmin
    .from(table)
    .update({ name: name.trim() })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const user = await auth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const id = searchParams.get('id');
  const type = searchParams.get('type') as 'category' | 'subcategory' | null;

  if (!id || !type) {
    return NextResponse.json({ error: 'id and type required' }, { status: 400 });
  }

  const table = type === 'subcategory' ? 'subcategories' : 'categories';
  const { error } = await supabaseAdmin.from(table).delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
