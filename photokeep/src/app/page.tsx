import { supabaseAdmin } from '@/lib/supabase/server';
import type { PostWithPhotos } from '@/types/database';
import PhotoCarousel from '@/components/feed/PhotoCarousel';
import Header from '@/components/ui/Header';
import PullToRefresh from '@/components/ui/PullToRefresh';
import { getSession } from '@/lib/auth/session';
import { isAdmin } from '@/lib/auth/admin';

// Cloudflare Pages Edge Runtime에서 매 요청마다 서버 렌더링 (정적 캐시 방지)
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}개월 전`;

  return `${Math.floor(months / 12)}년 전`;
}

export default async function FeedPage() {
  const user = await getSession();
  const showPrivate = user ? isAdmin(user.email) : false;

  let query = supabaseAdmin
    .from('posts')
    .select('*, photos(*)')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

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

      <div className="divide-y divide-border">
        {feed.map((post) => {
          const sortedPhotos = post.photos.sort(
            (a, b) => a.sort_order - b.sort_order
          );

          return (
            <article key={post.id} className="pb-3">
              <PhotoCarousel photos={sortedPhotos} />

              {/* Content + date */}
              <div className="px-4 pt-3">
                <div className="flex items-start gap-1">
                  {post.content && (
                    <p className="flex-1 text-sm leading-relaxed">
                      <span className="mr-1">{post.emoji}</span>
                      {post.content}
                    </p>
                  )}
                  {!post.content && post.emoji && (
                    <p className="flex-1 text-lg">{post.emoji}</p>
                  )}
                  {post.is_private && (
                    <span className="shrink-0 rounded bg-foreground/10 px-1.5 py-0.5 text-[10px] text-muted">
                      비공개
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted">
                  {timeAgo(post.created_at)}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </PullToRefresh>
  );
}
