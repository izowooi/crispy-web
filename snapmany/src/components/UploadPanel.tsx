"use client";

import { useCallback, useId, useState } from "react";
import {
  validateFile,
  processImage,
  ERROR_MESSAGES,
  type ImageMeta,
} from "@/components/uploadProcessor";

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB (RC max_upload_size_mb 기반)
const ACCEPT = "image/jpeg,image/png,image/webp";

export type UploadPanelProps = {
  onImageReady: (dataUrl: string, meta: ImageMeta) => void;
  onError?: (message: string) => void;
  maxSizeBytes?: number;
  className?: string;
};

export function UploadPanel({
  onImageReady,
  onError,
  maxSizeBytes = DEFAULT_MAX_SIZE,
  className = "",
}: UploadPanelProps) {
  const inputId = useId();
  const [preview, setPreview] = useState<{ dataUrl: string; meta: ImageMeta } | null>(
    null,
  );
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const reportError = useCallback(
    (message: string) => {
      if (onError) onError(message);
    },
    [onError],
  );

  const handleFile = useCallback(
    async (file: File) => {
      const validation = validateFile(file, maxSizeBytes);
      if (!validation.ok) {
        reportError(validation.message);
        return;
      }

      setIsProcessing(true);
      try {
        const processed = await processImage(file);
        setPreview(processed);
        onImageReady(processed.dataUrl, processed.meta);
      } catch (err) {
        const message =
          err instanceof Error && err.message
            ? err.message
            : ERROR_MESSAGES.canvasFailed;
        reportError(message);
      } finally {
        setIsProcessing(false);
      }
    },
    [maxSizeBytes, onImageReady, reportError],
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        void handleFile(file);
      }
      // allow re-selecting the same file
      e.target.value = "";
    },
    [handleFile],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) {
        void handleFile(file);
      }
    },
    [handleFile],
  );

  const zoneClass = [
    "relative w-full min-h-[160px] rounded-2xl border-2 border-dashed",
    "flex flex-col items-center justify-center gap-2 px-6 py-8",
    "cursor-pointer select-none transition-colors",
    "text-center",
    isDragging
      ? "border-accent bg-accent/5"
      : "border-border hover:border-accent",
    isProcessing ? "opacity-70 pointer-events-none" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="w-full">
      <label
        htmlFor={inputId}
        data-testid="upload-dropzone"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={zoneClass}
        aria-label="사진 업로드"
      >
        <input
          id={inputId}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={onInputChange}
        />

        {preview ? (
          <div className="flex flex-col items-center gap-3 w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview.dataUrl}
              alt="업로드된 이미지 미리보기"
              className="max-h-64 w-auto rounded-xl border border-border object-contain"
            />
            <div className="text-xs text-muted">
              {preview.meta.width} × {preview.meta.height} ·{" "}
              {formatBytes(preview.meta.sizeBytes)}
            </div>
            <div className="text-xs text-accent">
              다른 사진을 선택하려면 이 영역을 클릭하거나 새 파일을 드래그하세요
            </div>
          </div>
        ) : (
          <>
            <UploadIcon />
            <div className="text-sm font-medium text-foreground">
              사진을 드래그하거나 클릭해서 업로드
            </div>
            <div className="text-xs text-muted">
              JPG · PNG · WEBP, 최대 {Math.floor(maxSizeBytes / (1024 * 1024))}MB
            </div>
            {isProcessing && (
              <div className="text-xs text-accent" aria-live="polite">
                이미지 처리 중…
              </div>
            )}
          </>
        )}
      </label>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      aria-hidden="true"
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-muted"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
