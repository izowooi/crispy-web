'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { PostWithPhotos } from '@/types/database';

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

export default function AdminPostsPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<PostWithPhotos[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  const fetchPosts = useCallback(async () => {
    const res = await fetch('/api/admin/posts');
    if (res.ok) {
      const data = await res.json();
      setPosts(data.posts);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  async function handleDelete(id: string) {
    if (!confirm('이 포스트를 삭제하시겠습니까?')) return;
    setDeleting(id);
    const res = await fetch(`/api/admin/posts/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p.id !== id));
    }
    setDeleting(null);
  }

  async function handleMove(index: number, direction: 'up' | 'down') {
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= posts.length) return;

    setReordering(true);
    const newPosts = [...posts];
    [newPosts[index], newPosts[swapIndex]] = [newPosts[swapIndex], newPosts[index]];

    const items = newPosts.map((p, i) => ({ id: p.id, sort_order: i }));
    setPosts(newPosts);

    const res = await fetch('/api/admin/posts/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });

    if (!res.ok) {
      await fetchPosts(); // rollback
    }
    setReordering(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center px-4 pt-20">
        <p className="text-sm text-muted">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">포스트 관리</h1>
        <button
          onClick={() => router.push('/admin')}
          className="text-sm text-muted hover:text-foreground"
        >
          돌아가기
        </button>
      </div>
      <p className="mt-1 text-sm text-muted">{posts.length}개의 포스트</p>

      {posts.length === 0 && (
        <p className="mt-8 text-center text-sm text-muted">포스트가 없습니다</p>
      )}

      <div className="mt-4 space-y-2">
        {posts.map((post, index) => (
          <div
            key={post.id}
            className="flex items-center gap-3 rounded-xl border border-border p-3"
          >
            {/* Thumbnail */}
            <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-foreground/5">
              {post.cover_photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.cover_photo_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl">
                  {post.emoji}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">
                <span className="mr-1">{post.emoji}</span>
                {post.content || '(내용 없음)'}
              </p>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                <span>{timeAgo(post.created_at)}</span>
                <span>{post.photos.length}장</span>
                {post.is_private && (
                  <span className="rounded bg-foreground/10 px-1 py-0.5 text-[10px]">
                    비공개
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-shrink-0 items-center gap-1">
              {/* Move up */}
              <button
                onClick={() => handleMove(index, 'up')}
                disabled={index === 0 || reordering}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-foreground/5 hover:text-foreground disabled:opacity-30"
                aria-label="위로 이동"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="18 15 12 9 6 15" />
                </svg>
              </button>

              {/* Move down */}
              <button
                onClick={() => handleMove(index, 'down')}
                disabled={index === posts.length - 1 || reordering}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-foreground/5 hover:text-foreground disabled:opacity-30"
                aria-label="아래로 이동"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* Edit */}
              <button
                onClick={() => router.push(`/admin/posts/${post.id}/edit`)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-foreground/5 hover:text-foreground"
                aria-label="수정"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>

              {/* Delete */}
              <button
                onClick={() => handleDelete(post.id)}
                disabled={deleting === post.id}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-500/10 disabled:opacity-40"
                aria-label="삭제"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
