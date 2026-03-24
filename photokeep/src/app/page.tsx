import { supabaseAdmin } from '@/lib/supabase/server';
import type { PostWithPhotos } from '@/types/database';
import Header from '@/components/ui/Header';
import PullToRefresh from '@/components/ui/PullToRefresh';
import FeedList from '@/components/feed/FeedList';
import { getSession } from '@/lib/auth/session';
import { isAdmin } from '@/lib/auth/admin';

// Cloudflare Pages Edge Runtime에서 매 요청마다 서버 렌더링 (정적 캐시 방지)
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const INITIAL_LIMIT = 15;

export default async function FeedPage() {
  const user = await getSession();
  const showPrivate = user ? isAdmin(user.email) : false;

  let query = supabaseAdmin
    .from('posts')
    .select('*, photos(*)')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
    .range(0, INITIAL_LIMIT - 1);

  if (!showPrivate) {
    query = query.eq('is_private', false);
  }

  const { data: posts, error } = await query;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center px-4 pt-20">
        <p className="text-sm text-muted">피드를 불러올 수 없습니다</p>
        <p className="mt-1 text-xs text-muted">{error.message}</p>
      </div>
    );
  }

  const feed = (posts as PostWithPhotos[]) ?? [];

  if (feed.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 pt-20">
        <p className="text-lg font-medium">피드</p>
        <p className="mt-2 text-sm text-muted">아직 사진이 없습니다</p>
      </div>
    );
  }

  return (
    <PullToRefresh>
      <Header title="PhotoKeep" />
      <FeedList initialPosts={feed} showPrivate={showPrivate} />
    </PullToRefresh>
  );
}
