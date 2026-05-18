"use client";

import { useMemo } from "react";

export type PresetItem = {
  id: string;
  label: string;
  description?: string;
  body: string;
};

type Props = {
  label: string;
  presets: PresetItem[];
  selectedId: string;
  body: string;
  onSelectPreset: (id: string) => void;
  onBodyChange: (body: string) => void;
  /** 🎲 Random 버튼을 보일지 */
  showRandom?: boolean;
  onRandom?: () => void;
  rows?: number;
};

export function PresetSelector({
  label,
  presets,
  selectedId,
  body,
  onSelectPreset,
  onBodyChange,
  showRandom = false,
  onRandom,
  rows = 4,
}: Props) {
  const selected = useMemo(
    () => presets.find((p) => p.id === selectedId) ?? null,
    [presets, selectedId],
  );
  const modified = selected != null && selected.body.trim() !== body.trim();

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-dim)]">
          {label}
          {modified && (
            <span className="ml-1.5 rounded-sm bg-[var(--color-accent-soft)] px-1 py-0.5 text-[9px] font-normal text-[var(--color-accent)]">
              modified
            </span>
          )}
        </label>
        <div className="flex items-center gap-1">
          {showRandom && onRandom && (
            <button
              type="button"
              onClick={onRandom}
              className="rounded-md bg-[var(--color-accent-soft)] px-2 py-0.5 text-xs font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-fg)]"
            >
              🎲
            </button>
          )}
          <select
            value={selectedId}
            onChange={(e) => onSelectPreset(e.target.value)}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs focus:border-[var(--color-accent)] focus:outline-none"
            title={selected?.description ?? ""}
          >
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <textarea
        value={body}
        onChange={(e) => onBodyChange(e.target.value)}
        rows={rows}
        className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs leading-relaxed text-[var(--color-fg)] placeholder:text-[var(--color-fg-mute)] focus:border-[var(--color-accent)] focus:outline-none"
      />
      {selected?.description && (
        <p className="text-[10px] text-[var(--color-fg-mute)]">{selected.description}</p>
      )}
    </div>
  );
}
