"use client";

import type { JobStatus } from "@/lib/types";

export type BatchSlot = {
  jobId: string;
  status: JobStatus["status"];
  imageB64?: string;
  position?: number;
  error?: string;
};

type Props = {
  slots: BatchSlot[];
  emptyHint?: string;
};

export function BatchGrid({ slots, emptyHint }: Props) {
  if (slots.length === 0) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-bg-elev)] text-[var(--color-fg-mute)]">
        {emptyHint ?? "캐릭터 고르고 Generate 를 누르면 이미지가 여기 나옵니다"}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {slots.map((slot, i) => (
        <SlotCard key={slot.jobId ?? i} slot={slot} index={i} />
      ))}
    </div>
  );
}

function SlotCard({ slot, index }: { slot: BatchSlot; index: number }) {
  const ready = slot.status === "done" && slot.imageB64;
  return (
    <figure className="relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] aspect-[832/1216]">
      {ready ? (
        <img
          data-testid="result"
          src={`data:image/png;base64,${slot.imageB64}`}
          alt={`result ${index + 1}`}
          className="block h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-sm text-[var(--color-fg-mute)]">
          {slot.status === "queued" && (
            <>
              <span className="size-3 animate-pulse rounded-full bg-[var(--color-accent)]/40" />
              <span>대기 중{slot.position ? ` · ${slot.position}번째` : ""}</span>
            </>
          )}
          {slot.status === "processing" && (
            <>
              <span className="size-3 animate-pulse rounded-full bg-[var(--color-accent)]" />
              <span>생성 중…</span>
            </>
          )}
          {slot.status === "failed" && (
            <>
              <span className="text-[var(--color-danger)]">✗ 실패</span>
              <span className="px-3 text-center text-xs">{slot.error}</span>
            </>
          )}
        </div>
      )}
      {ready && (
        <a
          href={`data:image/png;base64,${slot.imageB64}`}
          download={`gennai-${slot.jobId}.png`}
          className="absolute right-2 top-2 rounded-md bg-white/80 px-2 py-1 text-xs text-[var(--color-fg)] backdrop-blur hover:bg-white"
          title="다운로드"
        >
          ⬇
        </a>
      )}
    </figure>
  );
}
