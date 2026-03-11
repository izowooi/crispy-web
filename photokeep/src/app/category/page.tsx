'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/ui/Header';
import type { Category, SubCategory, PostWithPhotos } from '@/types/database';

interface CategoryWithSubs extends Category {
  subcategories: SubCategory[];
}

interface CategoryDetailData {
  category: CategoryWithSubs;
  posts: PostWithPhotos[];
}

function CategoryContent() {
  const searchParams = useSearchParams();
  const catId = searchParams.get('cat');
  const subId = searchParams.get('sub');

  const [categories, setCategories] = useState<CategoryWithSubs[]>([]);
  const [detail, setDetail] = useState<CategoryDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setDetail(null);

    if (!catId) {
      fetch('/api/categories')
        .then((r) => r.json())
        .then((data) => setCategories(data.categories ?? []))
        .finally(() => setLoading(false));
    } else {
      const url = subId
        ? `/api/categories/${catId}?subcategoryId=${subId}`
        : `/api/categories/${catId}`;
      fetch(url)
        .then((r) => r.json())
        .then((json) => {
          if (json.category) setDetail({ category: json.category, posts: json.posts ?? [] });
        })
        .finally(() => setLoading(false));
    }
  }, [catId, subId]);

  // Category list view
  if (!catId) {
    return (
      <div>
        <Header title="카테고리" />
        {loading ? (
          <div className="flex items-center justify-center pt-20">
            <p className="text-sm text-muted">로딩 중...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 pt-20">
            <p className="text-sm text-muted">아직 카테고리가 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3 p-4">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/category?cat=${category.id}`}
                className="block rounded-xl border border-border p-4 transition-colors hover:bg-foreground/5"
              >
                <p className="font-semibold">{category.name}</p>
                {category.subcategories.length > 0 && (
                  <p className="mt-1 text-xs text-muted">
                    {category.subcategories.map((s) => s.name).join(' · ')}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Category detail / subcategory view
  const headerTitle = detail
    ? subId
      ? `${detail.category.name} › ${detail.category.subcategories.find((s) => s.id === subId)?.name ?? ''}`
      : detail.category.name
    : '카테고리';

  return (
    <div>
      <Header title={headerTitle} backHref="/category" />

      {loading ? (
        <div className="flex items-center justify-center pt-20">
          <p className="text-sm text-muted">로딩 중...</p>
        </div>
      ) : !detail ? (
        <div className="flex items-center justify-center pt-20">
          <p className="text-sm text-muted">카테고리를 찾을 수 없습니다</p>
        </div>
      ) : (
        <>
          {/* Subcategory tabs */}
          {detail.category.subcategories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto border-b border-border px-4 py-3">
              <Link
                href={`/category?cat=${catId}`}
                className={`shrink-0 rounded-full px-3 py-1 text-xs ${
                  !subId
                    ? 'bg-foreground font-medium text-background'
                    : 'border border-border hover:bg-foreground/5'
                }`}
              >
                전체
              </Link>
              {detail.category.subcategories.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/category?cat=${catId}&sub=${sub.id}`}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs ${
                    sub.id === subId
                      ? 'bg-foreground font-medium text-background'
                      : 'border border-border hover:bg-foreground/5'
                  }`}
                >
                  {sub.name}
                </Link>
              ))}
            </div>
          )}

          {/* Photo grid */}
          {detail.posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 pt-20">
              <p className="text-sm text-muted">이 카테고리에 사진이 없습니다</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0.5 p-0.5">
              {detail.posts.map((post) => {
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
        </>
      )}
    </div>
  );
}

export default function CategoryPage() {
  return (
    <Suspense
      fallback={
        <div>
          <Header title="카테고리" />
          <div className="flex items-center justify-center pt-20">
            <p className="text-sm text-muted">로딩 중...</p>
          </div>
        </div>
      }
    >
      <CategoryContent />
    </Suspense>
  );
}
