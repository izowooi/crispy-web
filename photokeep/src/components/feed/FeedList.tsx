'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { PostWithPhotos } from '@/types/database';
import PhotoCarousel from '@/components/feed/PhotoCarousel';
import DownloadButton from '@/components/feed/DownloadButton';

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

function PostItem({ post }: { post: PostWithPhotos }) {
  const sortedPhotos = post.photos.sort((a, b) => a.sort_order - b.sort_order);

  return (
    <article className="pb-3">
      <PhotoCarousel photos={sortedPhotos} />
      <div className="px-4 pt-3">
        <div className="flex items-start gap-1">
          {post.content && (
            <p className="flex-1 text-sm leading-relaxed whitespace-pre-line">
              {post.emoji && <span className="mr-1">{post.emoji}</span>}
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
          <DownloadButton photos={sortedPhotos} createdAt={post.created_at} />
        </div>
        <p className="mt-1 text-xs text-muted">{timeAgo(post.created_at)}</p>
      </div>
    </article>
  );
}

interface FeedListProps {
  initialPosts: PostWithPhotos[];
  showPrivate: boolean;
}

const LIMIT = 15;

export default function FeedList({ initialPosts, showPrivate }: FeedListProps) {
  const [posts, setPosts] = useState<PostWithPhotos[]>(initialPosts);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts.length === LIMIT);
  const offsetRef = useRef(initialPosts.length);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    try {
      const res = await fetch(
        `/api/feed?offset=${offsetRef.current}&limit=${LIMIT}`
      );
      if (!res.ok) throw new Error('fetch failed');

      const data = await res.json();
      setPosts((prev) => [...prev, ...data.posts]);
      offsetRef.current += data.posts.length;
      setHasMore(data.hasMore);
    } catch {
      // 실패해도 조용히 처리 — 스크롤 시 재시도 가능
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  // showPrivate 변경(로그인/로그아웃) 시 초기화
  useEffect(() => {
    setPosts(initialPosts);
    offsetRef.current = initialPosts.length;
    setHasMore(initialPosts.length === LIMIT);
  }, [initialPosts, showPrivate]);

  return (
    <div className="divide-y divide-border">
      {posts.map((post) => (
        <PostItem key={post.id} post={post} />
      ))}

      {/* 무한 스크롤 sentinel */}
      <div ref={sentinelRef} className="py-4 flex justify-center">
        {loading && (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="animate-spin text-muted"
          >
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
        )}
        {!hasMore && !loading && posts.length > 0 && (
          <p className="text-xs text-muted">모든 사진을 불러왔어요</p>
        )}
      </div>
    </div>
  );
}
