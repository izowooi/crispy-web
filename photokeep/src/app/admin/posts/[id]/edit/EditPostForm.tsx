'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Photo } from '@/types/database';
import CategorySelector from '@/components/ui/CategorySelector';

const EMOJI_OPTIONS = ['📷', '🌸', '👨‍👩‍👧‍👦', '🎂', '🌳', '☀️', '❤️', '🎉', '✨', '🏠'];

function isValidSingleEmoji(str: string): boolean {
  if (!str) return false;
  const emojiRegex = /^(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:\u200D(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*$/u;
  return emojiRegex.test(str);
}

function extractFirstEmoji(str: string): string | null {
  const emojiRegex = /(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:\u200D(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*/u;
  const match = str.match(emojiRegex);
  return match ? match[0] : null;
}

interface ExistingPhoto {
  type: 'existing';
  photo: Photo;
}

interface NewPhoto {
  type: 'new';
  file: File;
  previewUrl: string;
  width: number;
  height: number;
}

type PhotoItem = ExistingPhoto | NewPhoto;

export default function EditPostForm({ id }: { id: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [removedPhotoIds, setRemovedPhotoIds] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [emoji, setEmoji] = useState('');
  const [showCustomEmoji, setShowCustomEmoji] = useState(false);
  const [customEmojiInput, setCustomEmojiInput] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchPost() {
      const res = await fetch(`/api/admin/posts/${id}`);
      if (!res.ok) {
        setError('포스트를 불러올 수 없습니다');
        setLoading(false);
        return;
      }
      const data = await res.json();
      const post = data.post;

      setContent(post.content || '');
      setEmoji(post.emoji || '');
      setIsPrivate(post.is_private);
      setCategoryId(post.category_id ?? null);
      setSubcategoryId(post.subcategory_id ?? null);
      // Check if emoji is custom
      if (post.emoji && !EMOJI_OPTIONS.includes(post.emoji)) {
        setShowCustomEmoji(true);
        setCustomEmojiInput(post.emoji);
      }

      const sorted = (post.photos as Photo[]).sort(
        (a: Photo, b: Photo) => a.sort_order - b.sort_order
      );
      setPhotos(sorted.map((p: Photo) => ({ type: 'existing' as const, photo: p })));
      setLoading(false);
    }
    fetchPost();
  }, [id]);

  function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: 800, height: 600 });
      img.src = url;
    });
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (!selected) return;

    const newPhotos: PhotoItem[] = [];
    for (let i = 0; i < Math.min(selected.length, 10 - photos.length); i++) {
      const file = selected[i];
      const previewUrl = URL.createObjectURL(file);
      const dims = await getImageDimensions(previewUrl);
      newPhotos.push({ type: 'new', file, previewUrl, ...dims });
    }
    setPhotos((prev) => [...prev, ...newPhotos].slice(0, 10));
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      const item = prev[index];
      if (item.type === 'existing') {
        setRemovedPhotoIds((ids) => [...ids, item.photo.id]);
      } else {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  }

  function getPhotoUrl(item: PhotoItem): string {
    return item.type === 'existing' ? item.photo.url : item.previewUrl;
  }

  async function handleSave() {
    if (photos.length === 0) {
      setError('사진이 최소 1장 필요합니다');
      return;
    }
    setSaving(true);
    setError('');

    try {
      // Upload new photos to R2 if any
      const newPhotos = photos.filter((p): p is NewPhoto => p.type === 'new');
      let uploadedPhotos: { url: string; width: number; height: number }[] = [];

      if (newPhotos.length > 0) {
        const presignRes = await fetch('/api/admin/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            files: newPhotos.map((f) => ({
              filename: f.file.name,
              contentType: f.file.type || 'image/jpeg',
            })),
          }),
        });

        if (!presignRes.ok) throw new Error('Presign 요청 실패');
        const { files: presigned } = await presignRes.json();

        await Promise.all(
          presigned.map(async (p: { uploadUrl: string; contentType: string }, i: number) => {
            const res = await fetch(p.uploadUrl, {
              method: 'PUT',
              headers: { 'Content-Type': p.contentType },
              body: newPhotos[i].file,
            });
            if (!res.ok) throw new Error(`Upload failed for file ${i + 1}`);
          })
        );

        uploadedPhotos = presigned.map((p: { publicUrl: string }, i: number) => ({
          url: p.publicUrl,
          width: newPhotos[i].width,
          height: newPhotos[i].height,
        }));
      }

      // Build photo order and added_photos
      let newPhotoIndex = 0;
      const photo_order: { id: string; sort_order: number }[] = [];
      const added_photos: { url: string; width: number; height: number; sort_order: number }[] = [];

      photos.forEach((item, i) => {
        if (item.type === 'existing') {
          photo_order.push({ id: item.photo.id, sort_order: i });
        } else {
          added_photos.push({
            ...uploadedPhotos[newPhotoIndex],
            sort_order: i,
          });
          newPhotoIndex++;
        }
      });

      const patchRes = await fetch(`/api/admin/posts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          emoji,
          is_private: isPrivate,
          category_id: categoryId,
          subcategory_id: subcategoryId,
          removed_photo_ids: removedPhotoIds,
          added_photos,
          photo_order,
        }),
      });

      if (!patchRes.ok) throw new Error('저장 실패');

      // Cleanup preview URLs
      photos.forEach((item) => {
        if (item.type === 'new') URL.revokeObjectURL(item.previewUrl);
      });

      router.refresh();
      router.push('/admin/posts');
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center px-4 pt-20">
        <p className="text-sm text-muted">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">포스트 수정</h1>
        <button
          onClick={() => router.push('/admin/posts')}
          className="text-sm text-muted hover:text-foreground"
        >
          취소
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Preview grid */}
      {photos.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-1">
          {photos.map((item, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-lg bg-foreground/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getPhotoUrl(item)}
                alt={`사진 ${i + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                onClick={() => removePhoto(i)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white"
              >
                x
              </button>
              <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white">
                {i + 1}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Add photos button */}
      {photos.length < 10 && (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-8 text-sm text-muted hover:border-foreground/30 hover:text-foreground"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          사진 추가 ({photos.length}/10)
        </button>
      )}

      {/* Emoji selection */}
      <div className="mt-4">
        <label className="mb-2 block text-sm font-medium">이모지</label>
        <div className="flex flex-wrap gap-2">
          {/* 없음 버튼 */}
          <button
            type="button"
            onClick={() => { setEmoji(''); setShowCustomEmoji(false); setCustomEmojiInput(''); }}
            className={`flex h-11 w-11 items-center justify-center rounded-lg border text-xs transition-colors ${
              emoji === '' && !showCustomEmoji
                ? 'border-foreground bg-foreground/10'
                : 'border-border hover:bg-foreground/5'
            }`}
          >
            없음
          </button>
          {EMOJI_OPTIONS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => {
                setEmoji(e);
                setShowCustomEmoji(false);
                setCustomEmojiInput('');
              }}
              className={`flex h-11 w-11 items-center justify-center rounded-lg border text-xl transition-colors ${
                emoji === e && !showCustomEmoji
                  ? 'border-foreground bg-foreground/10'
                  : 'border-border hover:bg-foreground/5'
              }`}
            >
              {e}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowCustomEmoji(!showCustomEmoji)}
            className={`flex h-11 w-11 items-center justify-center rounded-lg border text-lg transition-colors ${
              showCustomEmoji
                ? 'border-foreground bg-foreground/10'
                : 'border-border hover:bg-foreground/5'
            }`}
          >
            ✏️
          </button>
        </div>
        {showCustomEmoji && (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="text"
              value={customEmojiInput}
              onChange={(e) => {
                const input = e.target.value;
                const extracted = extractFirstEmoji(input);
                if (extracted) {
                  setCustomEmojiInput(extracted);
                  setEmoji(extracted);
                } else if (input === '') {
                  setCustomEmojiInput('');
                }
              }}
              className="h-11 w-16 rounded-lg border border-border bg-transparent text-center text-xl focus:border-foreground/30 focus:outline-none"
              placeholder="😊"
              maxLength={4}
            />
            {customEmojiInput && isValidSingleEmoji(customEmojiInput) && (
              <span className="text-xs text-green-500">유효</span>
            )}
            <span className="text-xs text-muted">이모지 1개만 입력</span>
          </div>
        )}
      </div>

      <CategorySelector
        categoryId={categoryId}
        subcategoryId={subcategoryId}
        onChange={(cat, sub) => { setCategoryId(cat); setSubcategoryId(sub); }}
      />

      {/* Public/Private toggle */}
      <div className="mt-4 flex items-center justify-between rounded-xl border border-border px-4 py-3">
        <div>
          <p className="text-sm font-medium">{isPrivate ? '비공개' : '공개'}</p>
          <p className="text-xs text-muted">
            {isPrivate ? '관리자만 볼 수 있습니다' : '모든 가족이 볼 수 있습니다'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsPrivate(!isPrivate)}
          className={`relative h-7 w-12 rounded-full transition-colors ${
            isPrivate ? 'bg-foreground' : 'bg-foreground/20'
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-background shadow transition-transform ${
              isPrivate ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Content input */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="내용을 입력하세요 (선택)"
        rows={3}
        className="mt-4 w-full rounded-xl border border-border bg-transparent px-4 py-3 text-sm placeholder:text-muted focus:border-foreground/30 focus:outline-none"
      />

      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}

      <button
        onClick={handleSave}
        disabled={photos.length === 0 || saving}
        className="mt-4 w-full rounded-xl bg-foreground py-3 text-sm font-semibold text-background transition-opacity disabled:opacity-40"
      >
        {saving ? '저장 중...' : emoji ? `${emoji} 저장` : '저장'}
      </button>
    </div>
  );
}
