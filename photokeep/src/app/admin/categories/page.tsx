'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Category, SubCategory, PrivacyCount, CategoryPrivacyCounts } from '@/types/database';

interface CategoryWithSubs extends Category {
  subcategories: SubCategory[];
}

function PrivacyBadge({ count }: { count?: PrivacyCount }) {
  if (!count) return <p className="text-xs text-muted">포스트 없음</p>;
  return (
    <p className="text-xs text-muted">
      공개 {count.public} · 비공개 {count.private}
    </p>
  );
}

function BulkPrivacyControls({
  id,
  name,
  type,
  count,
  onAction,
}: {
  id: string;
  name: string;
  type: 'category' | 'subcategory';
  count?: PrivacyCount;
  onAction: (id: string, name: string, type: 'category' | 'subcategory', targetPrivate: boolean, affectedCount: number) => void;
}) {
  const total = (count?.public ?? 0) + (count?.private ?? 0);
  const allPublic = total > 0 && count?.private === 0;
  const allPrivate = total > 0 && count?.public === 0;

  return (
    <div className="flex gap-2">
      <button
        onClick={() => onAction(id, name, type, false, count?.private ?? 0)}
        disabled={allPublic || total === 0}
        className="rounded-md border border-border px-2 py-0.5 text-[11px] text-foreground/70 hover:border-foreground/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
      >
        전체 공개
      </button>
      <button
        onClick={() => onAction(id, name, type, true, count?.public ?? 0)}
        disabled={allPrivate || total === 0}
        className="rounded-md border border-border px-2 py-0.5 text-[11px] text-foreground/70 hover:border-foreground/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
      >
        전체 비공개
      </button>
    </div>
  );
}

function ConfirmModal({
  pending,
  working,
  modalError,
  onConfirm,
  onCancel,
}: {
  pending: { name: string; targetPrivate: boolean; count: number } | null;
  working: boolean;
  modalError: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!pending) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={working ? undefined : onCancel}>
      <div
        className="w-full max-w-lg rounded-t-2xl bg-background p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-2 text-base font-bold">카테고리 일괄 변경</h2>
        <p className="mb-1 text-sm text-foreground">
          「{pending.name}」의 모든 포스트를{' '}
          <span className="font-semibold">{pending.targetPrivate ? '비공개' : '공개'}</span>로
          변경합니다.
        </p>
        <p className="mb-4 text-xs text-muted">
          {pending.targetPrivate
            ? `공개 포스트 ${pending.count}개가 비공개로 전환됩니다.`
            : `비공개 포스트 ${pending.count}개가 공개로 전환됩니다.`}
        </p>
        {modalError && <p className="mb-3 text-sm text-red-500">{modalError}</p>}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={working}
            className="flex-1 rounded-xl border border-border py-2.5 text-sm disabled:opacity-40"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={working}
            className="flex-1 rounded-xl bg-foreground py-2.5 text-sm font-medium text-background disabled:opacity-60"
          >
            {working ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                변경 중...
              </span>
            ) : (
              '변경'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryWithSubs[]>([]);
  const [privacyCounts, setPrivacyCounts] = useState<CategoryPrivacyCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [newCatName, setNewCatName] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [newSubCatId, setNewSubCatId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingType, setEditingType] = useState<'category' | 'subcategory'>('category');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [bulkPending, setBulkPending] = useState<{
    type: 'category' | 'subcategory';
    id: string;
    name: string;
    targetPrivate: boolean;
    count: number;
  } | null>(null);
  const [bulkWorking, setBulkWorking] = useState(false);
  const [modalError, setModalError] = useState('');

  async function fetchCategories() {
    const res = await fetch('/api/admin/categories');
    if (res.ok) {
      const data = await res.json();
      setCategories(data.categories ?? []);
      setPrivacyCounts(data.privacyCounts ?? null);
    }
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  function openBulkModal(
    id: string,
    name: string,
    type: 'category' | 'subcategory',
    targetPrivate: boolean,
    affectedCount: number,
  ) {
    setModalError('');
    setBulkPending({ id, name, type, targetPrivate, count: affectedCount });
  }

  async function executeBulkPrivacy() {
    if (!bulkPending) return;
    setBulkWorking(true);
    setModalError('');

    const body =
      bulkPending.type === 'category'
        ? { category_id: bulkPending.id, is_private: bulkPending.targetPrivate }
        : { subcategory_id: bulkPending.id, is_private: bulkPending.targetPrivate };

    const res = await fetch('/api/admin/posts/bulk-privacy', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const d = await res.json();
      setBulkPending(null);
      setSuccessMsg(
        `${d.updated}개 포스트가 ${bulkPending.targetPrivate ? '비공개' : '공개'}로 변경되었습니다`,
      );
      fetchCategories();
      setTimeout(() => setSuccessMsg(''), 2500);
    } else {
      const d = await res.json();
      setModalError(d.error ?? '오류 발생');
    }
    setBulkWorking(false);
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
      {successMsg && <p className="mb-4 text-sm text-green-600">{successMsg}</p>}

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
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{cat.name}</p>
                    <PrivacyBadge count={privacyCounts?.byCategory[cat.id]} />
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <BulkPrivacyControls
                      id={cat.id}
                      name={cat.name}
                      type="category"
                      count={privacyCounts?.byCategory[cat.id]}
                      onAction={openBulkModal}
                    />
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
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm text-muted">└ {sub.name}</p>
                            <div className="pl-3">
                              <PrivacyBadge count={privacyCounts?.bySubcategory[sub.id]} />
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <BulkPrivacyControls
                              id={sub.id}
                              name={sub.name}
                              type="subcategory"
                              count={privacyCounts?.bySubcategory[sub.id]}
                              onAction={openBulkModal}
                            />
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

      <ConfirmModal
        pending={bulkPending}
        working={bulkWorking}
        modalError={modalError}
        onConfirm={executeBulkPrivacy}
        onCancel={() => !bulkWorking && setBulkPending(null)}
      />
    </div>
  );
}
