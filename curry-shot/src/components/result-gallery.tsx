"use client";

import { Download, Film, ImageIcon, RefreshCw, Sparkles } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { OverlayImage, OverlayLayer } from "./overlay-image";
import type { OverlayConfig, ResultAsset } from "./studio-types";

function BeforeAfter({
  originalUrl,
  resultUrl,
  overlay,
  aspectRatio,
}: {
  originalUrl: string;
  resultUrl: string;
  overlay: OverlayConfig;
  aspectRatio: string;
}) {
  const [position, setPosition] = useState(52);

  return (
    <div
      className="relative isolate w-full overflow-hidden rounded-[18px] bg-[#0b0b0b] shadow-[0_24px_70px_rgba(0,0,0,.22)]"
      style={{ aspectRatio }}
    >
      <Image
        src={originalUrl}
        alt="업로드한 원본"
        fill
        unoptimized
        className="object-contain"
        sizes="(max-width: 1024px) 100vw, 62vw"
      />
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <Image
          src={resultUrl}
          alt="실사화 결과"
          fill
          unoptimized
          className="object-contain"
          sizes="(max-width: 1024px) 100vw, 62vw"
        />
        <OverlayLayer overlay={overlay} />
      </div>
      <div className="pointer-events-none absolute inset-y-0 z-20 w-px bg-white shadow-[0_0_0_1px_rgba(0,0,0,.2),0_0_18px_rgba(0,0,0,.35)]" style={{ left: `${position}%` }}>
        <div className="absolute top-1/2 left-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-black/55 text-sm font-bold text-white shadow-xl backdrop-blur-md">
          ↔
        </div>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={position}
        onChange={(event) => setPosition(Number(event.target.value))}
        className="absolute inset-0 z-30 h-full w-full cursor-ew-resize opacity-0"
        aria-label="원본과 결과 비교 위치"
      />
      <div className="pointer-events-none absolute top-3 left-3 z-40 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold tracking-[0.12em] text-white uppercase backdrop-blur-md">
        Original
      </div>
      <div className="pointer-events-none absolute top-3 right-3 z-40 rounded-full bg-[linear-gradient(135deg,#1976f3,#4bc6f6)] px-2.5 py-1 text-[10px] font-bold tracking-[0.12em] text-white uppercase shadow-[0_6px_18px_rgba(25,118,243,.35)] backdrop-blur-md">
        Live action
      </div>
    </div>
  );
}

function PendingCard({ index }: { index: number }) {
  return (
    <div className="shimmer flex min-h-52 flex-col items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] p-6 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-ink)]">
        <Sparkles size={20} className="animate-pulse" />
      </div>
      <p className="text-sm font-semibold text-[var(--ink)]">변형 {index + 1}을 실사화하고 있어요</p>
      <p className="mt-1 text-xs text-[var(--muted)]">인물과 구도를 맞추는 중입니다</p>
    </div>
  );
}

function FailedCard({
  asset,
  onRetry,
  disabled,
}: {
  asset: ResultAsset;
  onRetry: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] p-6 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--danger-soft)] text-[var(--danger)]">
        <ImageIcon size={19} />
      </div>
      <p className="text-sm font-semibold text-[var(--ink)]">이 변형만 완성하지 못했어요</p>
      <p className="mt-1 max-w-xs text-xs leading-5 text-[var(--muted)]">{asset.error}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={disabled}
        className="mt-4 inline-flex h-9 items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--panel)] px-3.5 text-xs font-bold text-[var(--ink)] transition hover:border-[var(--accent)] disabled:opacity-45"
      >
        <RefreshCw size={13} /> 이 결과만 다시 만들기
      </button>
    </div>
  );
}

export function ResultGallery({
  results,
  originalUrl,
  overlay,
  aspectRatio,
  onDownload,
  onVideo,
  onRetry,
  videoLocked,
  generationLocked,
}: {
  results: ResultAsset[];
  originalUrl: string;
  overlay: OverlayConfig;
  aspectRatio: string;
  onDownload: (asset: ResultAsset) => void;
  onVideo: (asset: ResultAsset) => void;
  onRetry: (asset: ResultAsset) => void;
  videoLocked: boolean;
  generationLocked: boolean;
}) {
  const readyResults = useMemo(() => results.filter((result) => result.status === "ready" && result.url), [results]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = readyResults.find((result) => result.clientId === selectedId) ?? readyResults[0];

  if (results.length === 0) return null;

  return (
    <section aria-labelledby="results-title" className="space-y-5">
      <div>
        <h2 id="results-title" className="text-base font-bold tracking-[-0.03em] text-[var(--ink)]">
          실사화 결과
        </h2>
      </div>

      {selected?.url ? (
        <div className="studio-panel rounded-[24px] p-3 sm:p-4">
          <BeforeAfter originalUrl={originalUrl} resultUrl={selected.url} overlay={overlay} aspectRatio={aspectRatio} />
          <div className="flex flex-col gap-3 px-1 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--ink)]">선택한 변형 {selected.index + 1}</p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">{selected.modelLabel}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onDownload(selected)}
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-[var(--panel-raised)] px-4 text-xs font-bold text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-[var(--line-strong)] sm:flex-none"
              >
                <Download size={14} /> 저장
              </button>
              <button
                type="button"
                onClick={() => onVideo(selected)}
                disabled={videoLocked || generationLocked}
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-[var(--ink)] px-4 text-xs font-bold text-[var(--canvas)] transition hover:-translate-y-0.5 hover:opacity-90 disabled:translate-y-0 disabled:opacity-45 sm:flex-none"
              >
                <Film size={14} /> {videoLocked ? "영상 1개 생성됨" : generationLocked ? "이미지 완료 대기" : "영상으로 만들기"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {(results.length > 1 || !selected) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {results.map((asset) => {
            if (asset.status === "queued") return <PendingCard key={asset.clientId} index={asset.index} />;
            if (asset.status === "failed") {
              return (
                <FailedCard
                  key={asset.clientId}
                  asset={asset}
                  onRetry={() => onRetry(asset)}
                  disabled={generationLocked}
                />
              );
            }
            if (!asset.url) return null;
            const isSelected = selected?.clientId === asset.clientId;
            return (
              <button
                type="button"
                key={asset.clientId}
                onClick={() => setSelectedId(asset.clientId)}
                className={`group overflow-hidden rounded-2xl border bg-[var(--panel)] p-2 text-left shadow-[var(--shadow-xs)] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                  isSelected ? "border-[var(--accent)] ring-2 ring-[var(--accent-halo)]" : "border-[var(--line)] hover:-translate-y-0.5 hover:border-[var(--line-strong)]"
                }`}
              >
                <div className="relative overflow-hidden rounded-xl bg-black" style={{ aspectRatio }}>
                  <OverlayImage src={asset.url} alt={`실사화 변형 ${asset.index + 1}`} overlay={overlay} />
                </div>
                <div className="flex items-center justify-between gap-3 px-1 pt-2.5 pb-1">
                  <span className="text-xs font-bold text-[var(--ink)]">변형 {asset.index + 1}</span>
                  <span className="text-[10px] text-[var(--muted)]">{isSelected ? "비교 중" : "선택"}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
