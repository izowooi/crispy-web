'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/ui/Header';
import type { Category, SubCategory } from '@/types/database';

interface CategoryWithSubs extends Category {
  subcategories: SubCategory[];
}

export default function CategoryPage() {
  const [categories, setCategories] = useState<CategoryWithSubs[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data) => setCategories(data.categories ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <Header title="카테고리" />
        <div className="flex items-center justify-center pt-20">
          <p className="text-sm text-muted">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="카테고리" />

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 pt-20">
          <p className="text-sm text-muted">아직 카테고리가 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3 p-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/category/${category.id}`}
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
