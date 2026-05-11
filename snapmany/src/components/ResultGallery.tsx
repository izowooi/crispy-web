"use client";

import {
  GenerationCard,
  type GenerationItem,
} from "@/components/GenerationCard";

export type ResultGalleryProps = {
  items: GenerationItem[];
  onRetry?: (id: string) => void;
  onCopy?: (id: string) => void;
  onDownload?: (id: string) => void;
  className?: string;
};

export function ResultGallery({
  items,
  onRetry,
  onCopy,
  onDownload,
  className = "",
}: ResultGalleryProps) {
  if (items.length === 0) {
    return (
      <div
        data-testid="result-gallery-empty"
        className={[
          "w-full rounded-xl border border-dashed border-border bg-card",
          "px-6 py-12 text-center text-sm text-muted",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        이미지를 업로드하고 스타일을 선택해주세요.
      </div>
    );
  }

  return (
    <div
      data-testid="result-gallery"
      className={[
        "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 w-full",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {items.map((item) => (
        <GenerationCard
          key={item.id}
          item={item}
          onRetry={onRetry}
          onCopy={onCopy}
          onDownload={onDownload}
        />
      ))}
    </div>
  );
}
