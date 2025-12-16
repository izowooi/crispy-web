'use client';

import { Category, CATEGORIES } from '@/types';

interface CategoryFilterProps {
  selected: Category | 'all';
  categories: Category[];
  onChange: (category: Category | 'all') => void;
}

export function CategoryFilter({ selected, categories, onChange }: CategoryFilterProps) {
  const displayCategories = categories.length > 0 ? categories : CATEGORIES;

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onChange('all')}
        className={`
          px-4 py-2 rounded-full text-sm font-medium transition-colors
          ${selected === 'all'
            ? 'bg-primary text-white'
            : 'bg-card-bg text-foreground hover:bg-card-border'
          }
        `}
      >
        전체
      </button>

      {displayCategories.map((category) => (
        <button
          key={category}
          onClick={() => onChange(category)}
          className={`
            px-4 py-2 rounded-full text-sm font-medium transition-colors
            ${selected === category
              ? 'bg-primary text-white'
              : 'bg-card-bg text-foreground hover:bg-card-border'
            }
          `}
        >
          {category}
        </button>
      ))}
    </div>
  );
}
