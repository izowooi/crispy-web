"use client";

import type { BatchSlot } from "./BatchGrid";

export type HistoryBatch = {
  id: string;
  createdAt: number;
  /** 단일 jobId — 한 NAI 호출이 4장을 함께 반환 */
  jobId: string;
  slots: BatchSlot[];
  characters: string[];
};

type Props = {
  batches: HistoryBatch[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClear: () => void;
};

export function History({ batches, selectedId, onSelect, onClear }: Props) {
  return (
    <aside className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2">
        <span className="text-sm font-semibold text-[var(--color-fg-dim)]">History</span>
        {batches.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-[var(--color-fg-mute)] hover:text-[var(--color-danger)]"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex-1 overflow-auto p-2">
        {batches.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-[var(--color-fg-mute)]">
            생성한 이미지 묶음이
            <br />여기 쌓입니다
          </p>
        )}
        <ul className="space-y-2">
          {batches.map((b) => {
            const first = b.slots.find((s) => s.status === "done" && s.imageKey);
            const doneCount = b.slots.filter((s) => s.status === "done").length;
            const isSel = b.id === selectedId;
            return (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => onSelect(b.id)}
                  className={`relative block w-full overflow-hidden rounded-lg border ${
                    isSel
                      ? "border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/30"
                      : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
                  } bg-[var(--color-bg-elev)]`}
                >
                  <div className="aspect-[832/1216] w-full bg-[var(--color-bg-elev-2)]">
                    {first?.imageKey ? (
                      <img
                        src={`/api/img/${encodeURIComponent(first.imageKey)}`}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-[var(--color-fg-mute)]">
                        {doneCount}/{b.slots.length} …
                      </div>
                    )}
                  </div>
                  <span className="absolute bottom-1 right-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    ×{b.slots.length}
                  </span>
                  {b.characters.length > 0 && (
                    <span className="block truncate px-2 py-1 text-[10px] text-[var(--color-fg-dim)]">
                      {b.characters.join(", ")}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
