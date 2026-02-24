import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyJwt, COOKIE_NAME } from '@/lib/auth/jwt';

export const runtime = 'edge';

function auth(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyJwt(token);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await auth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const { data: post, error } = await supabaseAdmin
    .from('posts')
    .select('*, photos(*)')
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ post });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await auth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { content, emoji, is_private, sort_order, added_photos, removed_photo_ids, photo_order } = body as {
    content?: string;
    emoji?: string;
    is_private?: boolean;
    sort_order?: number;
    added_photos?: { url: string; width: number; height: number; sort_order: number }[];
    removed_photo_ids?: string[];
    photo_order?: { id: string; sort_order: number }[];
  };

  // Update post fields
  const updates: Record<string, unknown> = {};
  if (content !== undefined) updates.content = content || null;
  if (emoji !== undefined) updates.emoji = emoji;
  if (is_private !== undefined) updates.is_private = is_private;
  if (sort_order !== undefined) updates.sort_order = sort_order;

  if (Object.keys(updates).length > 0) {
    const { error: postError } = await supabaseAdmin
      .from('posts')
      .update(updates)
      .eq('id', id);

    if (postError) {
      return NextResponse.json({ error: postError.message }, { status: 500 });
    }
  }

  // Remove photos
  if (removed_photo_ids && removed_photo_ids.length > 0) {
    const { error: removeError } = await supabaseAdmin
      .from('photos')
      .delete()
      .in('id', removed_photo_ids);

    if (removeError) {
      return NextResponse.json({ error: removeError.message }, { status: 500 });
    }
  }

  // Add new photos
  if (added_photos && added_photos.length > 0) {
    const photoRows = added_photos.map((p) => ({
      post_id: id,
      url: p.url,
      thumbnail_url: p.url,
      width: p.width,
      height: p.height,
      sort_order: p.sort_order,
    }));

    const { error: addError } = await supabaseAdmin
      .from('photos')
      .insert(photoRows);

    if (addError) {
      return NextResponse.json({ error: addError.message }, { status: 500 });
    }
  }

  // Update photo order
  if (photo_order && photo_order.length > 0) {
    for (const item of photo_order) {
      await supabaseAdmin
        .from('photos')
        .update({ sort_order: item.sort_order })
        .eq('id', item.id);
    }
  }

  // Update cover_photo_url to first photo
  const { data: firstPhoto } = await supabaseAdmin
    .from('photos')
    .select('url')
    .eq('post_id', id)
    .order('sort_order', { ascending: true })
    .limit(1)
    .single();

  if (firstPhoto) {
    await supabaseAdmin
      .from('posts')
      .update({ cover_photo_url: firstPhoto.url })
      .eq('id', id);
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await auth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  // Delete photos first, then post
  await supabaseAdmin.from('photos').delete().eq('post_id', id);

  const { error } = await supabaseAdmin
    .from('posts')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
