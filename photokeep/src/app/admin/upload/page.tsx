'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

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

interface FilePreview {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
}

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [content, setContent] = useState('');
  const [emoji, setEmoji] = useState('📷');
  const [showCustomEmoji, setShowCustomEmoji] = useState(false);
  const [customEmojiInput, setCustomEmojiInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (!selected) return;

    const newFiles: FilePreview[] = [];
    for (let i = 0; i < Math.min(selected.length, 10 - files.length); i++) {
      const file = selected[i];
      const previewUrl = URL.createObjectURL(file);
      const dims = await getImageDimensions(previewUrl);
      newFiles.push({ file, previewUrl, ...dims });
    }
    setFiles((prev) => [...prev, ...newFiles].slice(0, 10));
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: 800, height: 600 });
      img.src = url;
    });
  }

  function removeFile(index: number) {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleUpload() {
    if (files.length === 0) return;
    setUploading(true);
    setError('');

    try {
      const presignRes = await fetch('/api/admin/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: files.map((f) => ({
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
            body: files[i].file,
          });
          if (!res.ok) throw new Error(`Upload failed for file ${i + 1}`);
        })
      );

      const postRes = await fetch('/api/admin/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          emoji,
          photos: presigned.map((p: { publicUrl: string }, i: number) => ({
            url: p.publicUrl,
            width: files[i].width,
            height: files[i].height,
            sort_order: i,
          })),
        }),
      });

      if (!postRes.ok) throw new Error('포스트 저장 실패');

      files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
      // refresh()를 먼저 호출해야 push() 후 이동한 페이지에서 최신 데이터를 받음
      router.refresh();
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드 실패');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-bold">사진 업로드</h1>
      <p className="mt-1 text-sm text-muted">최대 10장까지 선택할 수 있습니다</p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Preview grid */}
      {files.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-1">
          {files.map((f, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-lg bg-foreground/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={f.previewUrl}
                alt={`사진 ${i + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                onClick={() => removeFile(i)}
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
      {files.length < 10 && (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-8 text-sm text-muted hover:border-foreground/30 hover:text-foreground"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          사진 추가 ({files.length}/10)
        </button>
      )}

      {/* Emoji selection */}
      <div className="mt-4">
        <label className="mb-2 block text-sm font-medium">이모지</label>
        <div className="flex flex-wrap gap-2">
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
        onClick={handleUpload}
        disabled={files.length === 0 || uploading}
        className="mt-4 w-full rounded-xl bg-foreground py-3 text-sm font-semibold text-background transition-opacity disabled:opacity-40"
      >
        {uploading ? '업로드 중...' : `${emoji} 업로드`}
      </button>
    </div>
  );
}
