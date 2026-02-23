import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyJwt, COOKIE_NAME } from '@/lib/auth/jwt';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  // Get user from JWT
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await verifyJwt(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { content, emoji, photos } = body as {
    content: string;
    emoji: string;
    photos: { url: string; width: number; height: number; sort_order: number }[];
  };

  if (!photos || photos.length === 0) {
    return NextResponse.json({ error: 'At least one photo required' }, { status: 400 });
  }

  // Create post
  const { data: post, error: postError } = await supabaseAdmin
    .from('posts')
    .insert({
      content: content || null,
      emoji: emoji || '📷',
      author_name: user.name,
      cover_photo_url: photos[0].url,
    })
    .select('id')
    .single();

  if (postError) {
    return NextResponse.json({ error: postError.message }, { status: 500 });
  }

  // Create photos
  const photoRows = photos.map((p) => ({
    post_id: post.id,
    url: p.url,
    thumbnail_url: p.url,
    width: p.width,
    height: p.height,
    sort_order: p.sort_order,
  }));

  const { error: photoError } = await supabaseAdmin
    .from('photos')
    .insert(photoRows);

  if (photoError) {
    return NextResponse.json({ error: photoError.message }, { status: 500 });
  }

  return NextResponse.json({ id: post.id });
}
