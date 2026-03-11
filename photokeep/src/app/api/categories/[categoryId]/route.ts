import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  const { categoryId } = await params;
  const subcategoryId = request.nextUrl.searchParams.get('subcategoryId');

  const { data: categoryData, error: catError } = await supabaseAdmin
    .from('categories')
    .select('*, subcategories(*)')
    .eq('id', categoryId)
    .single();

  if (catError || !categoryData) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  const postsQuery = supabaseAdmin
    .from('posts')
    .select('*, photos(*)')
    .eq('is_private', false)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (subcategoryId) {
    postsQuery.eq('subcategory_id', subcategoryId);
  } else {
    postsQuery.eq('category_id', categoryId);
  }

  const { data: postsData } = await postsQuery;

  return NextResponse.json({
    category: categoryData,
    posts: postsData ?? [],
  });
}
