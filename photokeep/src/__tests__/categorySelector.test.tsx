import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CategorySelector from '@/components/ui/CategorySelector';

// Mock fetch
const mockCategories = [
  {
    id: 'cat-1',
    name: '2026년',
    created_at: '2026-01-01T00:00:00Z',
    subcategories: [
      { id: 'sub-1', category_id: 'cat-1', name: '박수아', created_at: '2026-01-01T00:00:00Z' },
    ],
  },
];

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    json: async () => ({ categories: mockCategories }),
  });
});

describe('CategorySelector', () => {
  it('renders category buttons after loading', async () => {
    render(
      <CategorySelector
        categoryId={null}
        subcategoryId={null}
        onCategoryChange={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('2026년')).toBeTruthy();
    });
    expect(screen.getByText('없음')).toBeTruthy();
  });

  it('shows subcategories when a category is selected', async () => {
    render(
      <CategorySelector
        categoryId="cat-1"
        subcategoryId={null}
        onCategoryChange={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('박수아')).toBeTruthy();
    });
  });

  it('does not show subcategories when no category selected', async () => {
    render(
      <CategorySelector
        categoryId={null}
        subcategoryId={null}
        onCategoryChange={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('2026년')).toBeTruthy();
    });

    expect(screen.queryByText('박수아')).toBeNull();
  });

  it('calls onCategoryChange when category button clicked', async () => {
    const onChange = vi.fn();
    render(
      <CategorySelector
        categoryId={null}
        subcategoryId={null}
        onCategoryChange={onChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('2026년')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('2026년'));
    expect(onChange).toHaveBeenCalledWith('cat-1', null);
  });

  it('calls onCategoryChange with null when 없음 clicked', async () => {
    const onChange = vi.fn();
    render(
      <CategorySelector
        categoryId="cat-1"
        subcategoryId={null}
        onCategoryChange={onChange}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText('없음').length).toBeGreaterThan(0);
    });

    // '없음' 버튼 클릭 (대분류 없음 - 첫 번째)
    const noneButtons = screen.getAllByText('없음');
    fireEvent.click(noneButtons[0]);
    expect(onChange).toHaveBeenCalledWith(null, null);
  });
});
