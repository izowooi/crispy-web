import { describe, it, expect } from 'vitest';
import type { Category, SubCategory, Post } from '@/types/database';

describe('Category types', () => {
  it('Category interface has required fields', () => {
    const category: Category = {
      id: 'cat-1',
      name: '2026년',
      created_at: '2026-01-01T00:00:00Z',
    };
    expect(category.id).toBe('cat-1');
    expect(category.name).toBe('2026년');
    expect(category.created_at).toBeTruthy();
  });

  it('SubCategory interface has required fields', () => {
    const sub: SubCategory = {
      id: 'sub-1',
      category_id: 'cat-1',
      name: '박수아',
      created_at: '2026-01-01T00:00:00Z',
    };
    expect(sub.id).toBe('sub-1');
    expect(sub.category_id).toBe('cat-1');
    expect(sub.name).toBe('박수아');
  });

  it('Post has optional category fields', () => {
    const postWithCategory: Post = {
      id: 'post-1',
      content: '테스트',
      emoji: '📷',
      is_private: false,
      author_name: '홍길동',
      sort_order: 0,
      cover_photo_url: null,
      category_id: 'cat-1',
      subcategory_id: 'sub-1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    expect(postWithCategory.category_id).toBe('cat-1');
    expect(postWithCategory.subcategory_id).toBe('sub-1');
  });

  it('Post category fields can be null', () => {
    const postWithoutCategory: Post = {
      id: 'post-2',
      content: null,
      emoji: '',
      is_private: false,
      author_name: '홍길동',
      sort_order: 1,
      cover_photo_url: null,
      category_id: null,
      subcategory_id: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    expect(postWithoutCategory.category_id).toBeNull();
    expect(postWithoutCategory.subcategory_id).toBeNull();
  });
});

describe('Category selection rules', () => {
  it('subcategory requires a category', () => {
    // 중분류만 선택은 불가 - category_id가 있어야 subcategory_id 설정 가능
    function validateCategorySelection(
      categoryId: string | null,
      subcategoryId: string | null
    ): boolean {
      if (subcategoryId !== null && categoryId === null) return false;
      return true;
    }

    expect(validateCategorySelection(null, null)).toBe(true);
    expect(validateCategorySelection('cat-1', null)).toBe(true);
    expect(validateCategorySelection('cat-1', 'sub-1')).toBe(true);
    expect(validateCategorySelection(null, 'sub-1')).toBe(false);
  });
});
