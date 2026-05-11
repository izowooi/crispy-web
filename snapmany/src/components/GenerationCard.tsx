"use client";

export type GenerationStatus =
  | "idle"
  | "uploading"
  | "generating"
  | "completed"
  | "failed";

export type GenerationItem = {
  /** Client-side unique id (e.g., `${styleId}-${nonce}`). */
  id: string;
  styleId: string;
  styleLabel: string;
  status: GenerationStatus;
  imageUrl?: string;
  error?: string;
};

export type GenerationCardProps = {
  item: GenerationItem;
  onRetry?: (id: string) => void;
  onCopy?: (id: string) => void;
  onDownload?: (id: string) => void;
};

const STATUS_TEXT: Record<GenerationStatus, string> = {
  idle: "대기 중…",
  uploading: "업로드 중…",
  generating: "생성 중…",
  completed: "완료",
  failed: "실패",
};

export function GenerationCard({
  item,
  onRetry,
  onCopy,
  onDownload,
}: GenerationCardProps) {
  const { id, styleLabel, status, imageUrl, error } = item;

  const baseShell = [
    "group relative aspect-square w-full rounded-xl overflow-hidden",
    "border border-border bg-card",
    "flex items-center justify-center",
  ].join(" ");

  if (status === "completed" && imageUrl) {
    return (
      <div className={baseShell} data-testid={`generation-card-${id}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={styleLabel}
          className="w-full h-full object-cover"
        />
        {/* overlay: always visible on mobile, fades on hover for desktop */}
        <div
          className={[
            "absolute inset-x-0 bottom-0 p-2",
            "flex items-center justify-between gap-2",
            "bg-gradient-to-t from-black/70 to-transparent",
            "opacity-100 sm:opacity-0 sm:group-hover:opacity-100",
            "transition-opacity",
          ].join(" ")}
        >
          <div className="text-xs text-white font-medium drop-shadow truncate">
            {styleLabel}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {onCopy && (
              <button
                type="button"
                data-testid="generation-copy"
                onClick={() => onCopy(id)}
                className="text-xs px-2 py-1 rounded-md bg-white/90 text-black hover:bg-white"
                aria-label={`${styleLabel} 복사`}
              >
                복사
              </button>
            )}
            {onDownload && (
              <button
                type="button"
                data-testid="generation-download"
                onClick={() => onDownload(id)}
                className="text-xs px-2 py-1 rounded-md bg-accent text-white hover:bg-accent-hover"
                aria-label={`${styleLabel} 다운로드`}
              >
                다운로드
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div
        className={[baseShell, "bg-card"].join(" ")}
        data-testid={`generation-card-${id}`}
      >
        <div className="flex flex-col items-center justify-center gap-2 px-3 text-center">
          <div className="text-sm font-medium text-foreground">{styleLabel}</div>
          <div className="text-xs text-red-500 break-words max-h-24 overflow-hidden">
            {error ?? "알 수 없는 오류"}
          </div>
          {onRetry && (
            <button
              type="button"
              data-testid="generation-retry"
              onClick={() => onRetry(id)}
              className="mt-1 text-xs px-3 py-1.5 rounded-md border border-accent text-accent hover:bg-accent hover:text-white transition-colors"
            >
              다시 생성
            </button>
          )}
        </div>
      </div>
    );
  }

  // idle / uploading / generating → spinner
  return (
    <div className={baseShell} data-testid={`generation-card-${id}`}>
      <div className="flex flex-col items-center justify-center gap-3">
        <Spinner />
        <div className="text-sm font-medium text-foreground">{styleLabel}</div>
        <div className="text-xs text-muted" aria-live="polite">
          {STATUS_TEXT[status]}
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div
      data-testid="generation-spinner"
      role="status"
      aria-label="진행 중"
      className="w-8 h-8 rounded-full border-2 border-border border-t-accent animate-spin"
    />
  );
}
