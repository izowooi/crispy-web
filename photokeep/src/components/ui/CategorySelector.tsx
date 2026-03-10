'use client';

import { useEffect, useState } from 'react';
import type { Category, SubCategory } from '@/types/database';

interface CategoryWithSubs extends Category {
  subcategories: SubCategory[];
}

interface CategorySelectorProps {
  categoryId: string | null;
  subcategoryId: string | null;
  onCategoryChange: (categoryId: string | null, subcategoryId: string | null) => void;
}

export default function CategorySelector({
  categoryId,
  subcategoryId,
  onCategoryChange,
}: CategorySelectorProps) {
  const [categories, setCategories] = useState<CategoryWithSubs[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data) => {
        setCategories(data.categories ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const selectedCategory = categories.find((c) => c.id === categoryId) ?? null;

  function handleCategorySelect(id: string | null) {
    onCategoryChange(id, null);
  }

  function handleSubcategorySelect(id: string | null) {
    onCategoryChange(categoryId, id);
  }

  if (loading) {
    return <p className="text-xs text-muted">카테고리 로딩 중...</p>;
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* 대분류 선택 */}
      <div>
        <label className="mb-2 block text-sm font-medium">대분류</label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleCategorySelect(null)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              categoryId === null
                ? 'border-foreground bg-foreground/10 font-medium'
                : 'border-border hover:bg-foreground/5'
            }`}
          >
            없음
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategorySelect(cat.id)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                categoryId === cat.id
                  ? 'border-foreground bg-foreground/10 font-medium'
                  : 'border-border hover:bg-foreground/5'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* 중분류 선택 (대분류 선택 시만 표시) */}
      {selectedCategory && selectedCategory.subcategories.length > 0 && (
        <div>
          <label className="mb-2 block text-sm font-medium">중분류</label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleSubcategorySelect(null)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                subcategoryId === null
                  ? 'border-foreground bg-foreground/10 font-medium'
                  : 'border-border hover:bg-foreground/5'
              }`}
            >
              없음
            </button>
            {selectedCategory.subcategories.map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => handleSubcategorySelect(sub.id)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  subcategoryId === sub.id
                    ? 'border-foreground bg-foreground/10 font-medium'
                    : 'border-border hover:bg-foreground/5'
                }`}
              >
                {sub.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
