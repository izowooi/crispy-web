'use client';

import { useState, useEffect } from 'react';
import type { Category, SubCategory } from '@/types/database';

interface CategoryWithSubs extends Category {
  subcategories: SubCategory[];
}

interface Props {
  categoryId: string | null;
  subcategoryId: string | null;
  onChange: (categoryId: string | null, subcategoryId: string | null) => void;
}

export default function CategorySelector({ categoryId, subcategoryId, onChange }: Props) {
  const [categories, setCategories] = useState<CategoryWithSubs[]>([]);

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data) => setCategories(data.categories ?? []));
  }, []);

  const selectedCategory = categories.find((c) => c.id === categoryId) ?? null;

  function handleCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value || null;
    onChange(val, null);
  }

  function handleSubcategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value || null;
    onChange(categoryId, val);
  }

  if (categories.length === 0) return null;

  return (
    <div className="mt-4">
      <label className="mb-2 block text-sm font-medium">카테고리</label>
      <div className="flex flex-col gap-2">
        <select
          value={categoryId ?? ''}
          onChange={handleCategoryChange}
          className="w-full rounded-xl border border-border bg-transparent px-4 py-3 text-sm focus:border-foreground/30 focus:outline-none"
        >
          <option value="">없음</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        {selectedCategory && selectedCategory.subcategories.length > 0 && (
          <select
            value={subcategoryId ?? ''}
            onChange={handleSubcategoryChange}
            className="w-full rounded-xl border border-border bg-transparent px-4 py-3 text-sm focus:border-foreground/30 focus:outline-none"
          >
            <option value="">소분류 없음</option>
            {selectedCategory.subcategories.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
