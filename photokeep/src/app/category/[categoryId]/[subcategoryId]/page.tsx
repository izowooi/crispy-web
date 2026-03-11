'use client';

export const runtime = 'edge';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/ui/Header';
import type { Category, SubCategory, PostWithPhotos } from '@/types/database';

interface CategoryWithSubs extends Category {
  subcategories: SubCategory[];
}

interface PageData {
  category: CategoryWithSubs;
  posts: PostWithPhotos[];
}

export default function SubCategoryPage() {
  const { categoryId, subcategoryId } = useParams<{ categoryId: string; subcategoryId: string }>();
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/categories/${categoryId}?subcategoryId=${subcategoryId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.category) setData({ category: json.category, posts: json.posts ?? [] });
      })
      .finally(() => setLoading(false));
  }, [categoryId, subcategoryId]);

  if (loading) {
    return (
      <div>
        <Header title="카테고리" backHref={`/category/${categoryId}`} />
        <div className="flex items-center justify-center pt-20">
          <p className="text-sm text-muted">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <Header title="카테고리" backHref={`/category/${categoryId}`} />
        <div className="flex items-center justify-center pt-20">
          <p className="text-sm text-muted">카테고리를 찾을 수 없습니다</p>
        </div>
      </div>
    );
  }

  const { category, posts } = data;
  const subcategory = category.subcategories.find((s) => s.id === subcategoryId);

  return (
    <div>
      <Header
        title={subcategory ? `${category.name} › ${subcategory.name}` : category.name}
        backHref={`/category/${categoryId}`}
      />

      {/* Subcategory tabs */}
      <div className="flex gap-2 overflow-x-auto border-b border-border px-4 py-3">
        <Link
          href={`/category/${categoryId}`}
          className="shrink-0 rounded-full border border-border px-3 py-1 text-xs hover:bg-foreground/5"
        >
          전체
        </Link>
        {category.subcategories.map((sub) => (
          <Link
            key={sub.id}
            href={`/category/${categoryId}/${sub.id}`}
            className={`shrink-0 rounded-full px-3 py-1 text-xs ${
              sub.id === subcategoryId
                ? 'bg-foreground font-medium text-background'
                : 'border border-border hover:bg-foreground/5'
            }`}
          >
            {sub.name}
          </Link>
        ))}
      </div>

      {/* Photo grid */}
      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 pt-20">
          <p className="text-sm text-muted">이 카테고리에 사진이 없습니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5 p-0.5">
          {posts.map((post) => {
            const cover = post.cover_photo_url ?? post.photos?.[0]?.url;
            return (
              <div key={post.id} className="relative aspect-square overflow-hidden bg-foreground/5">
                {cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover}
                    alt={post.content ?? ''}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                )}
                {post.photos?.length > 1 && (
                  <span className="absolute right-1 top-1 text-white drop-shadow">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M21 3H3v18l4-4h14V3z" />
                    </svg>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
