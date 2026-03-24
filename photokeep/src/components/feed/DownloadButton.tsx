'use client';

import { useState } from 'react';
import type { Photo } from '@/types/database';

interface DownloadButtonProps {
  photos: Photo[];
  createdAt: string;
}

export default function DownloadButton({ photos, createdAt }: DownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  const dateStr = new Date(createdAt).toISOString().slice(0, 10);
  const label = photos.length === 1 ? '저장' : `${photos.length}장 저장`;

  async function handleDownload() {
    if (loading) return;
    setLoading(true);
    setProgress(0);
    setDone(false);

    try {
      if (photos.length === 1) {
        const res = await fetch(photos[0].url);
        const blob = await res.blob();
        const ext = photos[0].url.split('.').pop()?.split('?')[0] ?? 'jpg';
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `photokeep-${dateStr}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();

        for (let i = 0; i < photos.length; i++) {
          setProgress(i + 1);
          const res = await fetch(photos[i].url);
          const blob = await res.blob();
          const ext = photos[i].url.split('.').pop()?.split('?')[0] ?? 'jpg';
          zip.file(`photo-${String(i + 1).padStart(2, '0')}.${ext}`, blob);
        }

        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `photokeep-${dateStr}-${photos.length}장.zip`;
        a.click();
        URL.revokeObjectURL(url);
      }

      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch (err) {
      console.error('다운로드 실패:', err);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs text-muted transition-colors hover:bg-foreground/5 disabled:opacity-60"
      aria-label="사진 다운로드"
    >
      {done ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>완료</span>
        </>
      ) : loading ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
          <span>{photos.length > 1 ? `${progress}/${photos.length}` : '저장 중...'}</span>
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
