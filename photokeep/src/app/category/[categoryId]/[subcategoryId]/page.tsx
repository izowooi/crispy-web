import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/server';
import Header from '@/components/ui/Header';
import type { Category, SubCategory, PostWithPhotos } from '@/types/database';

export const runtime = 'edge';

interface CategoryWithSubs extends Category {
  subcategories: SubCategory[];
}

export default async function SubCategoryPage({
  params,
}: {
  params: Promise<{ categoryId: string; subcategoryId: string }>;
}) {
  const { categoryId, subcategoryId } = await params;

  const { data: categoryData, error: catError } = await supabaseAdmin
    .from('categories')
    .select('*, subcategories(*)')
    .eq('id', categoryId)
    .single();

  if (catError || !categoryData) return notFound();

  const category = categoryData as CategoryWithSubs;
  const subcategory = category.subcategories.find((s) => s.id === subcategoryId);
  if (!subcategory) return notFound();

  const { data: postsData } = await supabaseAdmin
    .from('posts')
    .select('*, photos(*)')
    .eq('subcategory_id', subcategoryId)
    .eq('is_private', false)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  const posts = (postsData as PostWithPhotos[]) ?? [];

  return (
    <div>
      <Header title={`${category.name} › ${subcategory.name}`} backHref={`/category/${categoryId}`} />

      {/* Subcategory tabs */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3 border-b border-border">
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
                ? 'bg-foreground text-background font-medium'
                : 'border border-border hover:bg-foreground/5'
            }`}
          >
            {sub.name}
          </Link>
        ))}
      </div>

      {/* Feed grid */}
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
