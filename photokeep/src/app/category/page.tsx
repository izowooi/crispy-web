import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import Header from '@/components/ui/Header';
import type { Category, SubCategory } from '@/types/database';

export const runtime = 'edge';

interface CategoryWithSubs extends Category {
  subcategories: SubCategory[];
}

export default async function CategoryPage() {
  const { data, error } = await supabase
    .from('categories')
    .select('*, subcategories(*)')
    .order('created_at', { ascending: true });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center px-4 pt-20">
        <p className="text-sm text-muted">카테고리를 불러올 수 없습니다</p>
      </div>
    );
  }

  const categories = (data as CategoryWithSubs[]) ?? [];

  return (
    <div>
      <Header title="카테고리" />

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 pt-20">
          <p className="text-sm text-muted">아직 카테고리가 없습니다</p>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/category/${category.id}`}
              className="block rounded-xl border border-border p-4 hover:bg-foreground/5 transition-colors"
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
