import { supabase } from '@/lib/supabase/client';
import type { PostWithPhotos } from '@/types/database';
import PhotoCarousel from '@/components/feed/PhotoCarousel';

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
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*, photos(*)')
    .order('created_at', { ascending: false });

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
    <div>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-4 py-3">
        <h1 className="text-lg font-semibold">PhotoKeep</h1>
        <a href="/login" className="text-xs text-muted hover:text-foreground">
          로그인
        </a>
      </header>

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
                {post.content && (
                  <p className="text-sm leading-relaxed">{post.content}</p>
                )}
                <p className="mt-1 text-xs text-muted">
                  {timeAgo(post.created_at)}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
