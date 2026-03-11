'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Category, SubCategory } from '@/types/database';

interface CategoryWithSubs extends Category {
  subcategories: SubCategory[];
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryWithSubs[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCatName, setNewCatName] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [newSubCatId, setNewSubCatId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingType, setEditingType] = useState<'category' | 'subcategory'>('category');
  const [error, setError] = useState('');

  async function fetchCategories() {
    const res = await fetch('/api/admin/categories');
    if (res.ok) {
      const data = await res.json();
      setCategories(data.categories ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchCategories();
  }, []);

  async function createCategory() {
    if (!newCatName.trim()) return;
    setError('');
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCatName.trim() }),
    });
    if (res.ok) {
      setNewCatName('');
      fetchCategories();
    } else {
      const d = await res.json();
      setError(d.error ?? '오류 발생');
    }
  }

  async function createSubcategory() {
    if (!newSubName.trim() || !newSubCatId) return;
    setError('');
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newSubName.trim(), category_id: newSubCatId }),
    });
    if (res.ok) {
      setNewSubName('');
      fetchCategories();
    } else {
      const d = await res.json();
      setError(d.error ?? '오류 발생');
    }
  }

  async function saveEdit() {
    if (!editingId || !editingName.trim()) return;
    setError('');
    const res = await fetch('/api/admin/categories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingId, name: editingName.trim(), type: editingType }),
    });
    if (res.ok) {
      setEditingId(null);
      fetchCategories();
    } else {
      const d = await res.json();
      setError(d.error ?? '오류 발생');
    }
  }

  async function deleteItem(id: string, type: 'category' | 'subcategory', name: string) {
    if (!confirm(`"${name}"을(를) 삭제하시겠습니까?`)) return;
    setError('');
    const res = await fetch(`/api/admin/categories?id=${id}&type=${type}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      fetchCategories();
    } else {
      const d = await res.json();
      setError(d.error ?? '오류 발생');
    }
  }

  function startEdit(id: string, name: string, type: 'category' | 'subcategory') {
    setEditingId(id);
    setEditingName(name);
    setEditingType(type);
  }

  return (
    <div className="px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin" className="text-sm text-muted hover:text-foreground">
          ← 관리자
        </Link>
        <h1 className="text-xl font-bold">카테고리 관리</h1>
      </div>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      {/* Add category */}
      <div className="mb-6 rounded-xl border border-border p-4">
        <p className="mb-3 text-sm font-medium">대분류 추가</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createCategory()}
            placeholder="대분류 이름"
            className="flex-1 rounded-lg border border-border bg-transparent px-3 py-2 text-sm focus:border-foreground/30 focus:outline-none"
          />
          <button
            onClick={createCategory}
            disabled={!newCatName.trim()}
            className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-40"
          >
            추가
          </button>
        </div>
      </div>

      {/* Add subcategory */}
      {categories.length > 0 && (
        <div className="mb-6 rounded-xl border border-border p-4">
          <p className="mb-3 text-sm font-medium">소분류 추가</p>
          <div className="flex flex-col gap-2">
            <select
              value={newSubCatId}
              onChange={(e) => setNewSubCatId(e.target.value)}
              className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm focus:border-foreground/30 focus:outline-none"
            >
              <option value="">대분류 선택</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createSubcategory()}
                placeholder="소분류 이름"
                className="flex-1 rounded-lg border border-border bg-transparent px-3 py-2 text-sm focus:border-foreground/30 focus:outline-none"
              />
              <button
                onClick={createSubcategory}
                disabled={!newSubName.trim() || !newSubCatId}
                className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-40"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category list */}
      {loading ? (
        <p className="text-sm text-muted">로딩 중...</p>
      ) : categories.length === 0 ? (
        <p className="text-sm text-muted">카테고리가 없습니다</p>
      ) : (
        <div className="space-y-4">
          {categories.map((cat) => (
            <div key={cat.id} className="rounded-xl border border-border p-4">
              {/* Category row */}
              {editingId === cat.id && editingType === 'category' ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                    className="flex-1 rounded-lg border border-border bg-transparent px-3 py-1.5 text-sm focus:border-foreground/30 focus:outline-none"
                    autoFocus
                  />
                  <button onClick={saveEdit} className="text-xs font-medium text-foreground">저장</button>
                  <button onClick={() => setEditingId(null)} className="text-xs text-muted">취소</button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{cat.name}</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => startEdit(cat.id, cat.name, 'category')}
                      className="text-xs text-muted hover:text-foreground"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => deleteItem(cat.id, 'category', cat.name)}
                      className="text-xs text-red-500 hover:text-red-600"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              )}

              {/* Subcategory list */}
              {cat.subcategories.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  {cat.subcategories.map((sub) => (
                    <div key={sub.id}>
                      {editingId === sub.id && editingType === 'subcategory' ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                            className="flex-1 rounded-lg border border-border bg-transparent px-3 py-1 text-sm focus:border-foreground/30 focus:outline-none"
                            autoFocus
                          />
                          <button onClick={saveEdit} className="text-xs font-medium text-foreground">저장</button>
                          <button onClick={() => setEditingId(null)} className="text-xs text-muted">취소</button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted">└ {sub.name}</p>
                          <div className="flex gap-3">
                            <button
                              onClick={() => startEdit(sub.id, sub.name, 'subcategory')}
                              className="text-xs text-muted hover:text-foreground"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => deleteItem(sub.id, 'subcategory', sub.name)}
                              className="text-xs text-red-500 hover:text-red-600"
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
