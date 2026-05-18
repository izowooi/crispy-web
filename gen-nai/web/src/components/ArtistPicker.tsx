"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";
import type { ArtistPreset, ArtistSelection } from "@/lib/types";

type Props = {
  selected: ArtistSelection[];
  onChange: (next: ArtistSelection[]) => void;
};

const MIN_W = 0.1;
const MAX_W = 5.0;
const STEP = 0.1;

export function ArtistPicker({ selected, onChange }: Props) {
  const [all, setAll] = useState<ArtistPreset[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/artist-presets.json")
      .then((r) => r.json())
      .then((rows) => setAll(rows as ArtistPreset[]))
      .catch(() => setAll([]));
  }, []);

  const fuse = useMemo(
    () =>
      new Fuse(all, {
        keys: [
          { name: "name", weight: 0.7 },
          { name: "otherNames", weight: 0.3 },
        ],
        threshold: 0.35,
        minMatchCharLength: 1,
        ignoreLocation: true,
      }),
    [all],
  );

  const selectedNames = useMemo(
    () => new Set(selected.map((s) => s.name)),
    [selected],
  );

  const results = useMemo(() => {
    const q = query.trim();
    let pool: ArtistPreset[];
    if (q === "") pool = all.slice(0, 25);
    else pool = fuse.search(q, { limit: 25 }).map((r) => r.item);
    return pool.filter((p) => !selectedNames.has(p.name));
  }, [all, fuse, query, selectedNames]);

  function add(p: ArtistPreset) {
    if (selected.length >= 12) return; // 안전 상한
    onChange([
      ...selected,
      { name: p.name, weight: p.defaultWeight },
    ]);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  }

  function removeAt(i: number) {
    onChange(selected.filter((_, idx) => idx !== i));
  }

  function updateWeight(i: number, w: number) {
    const clamped = Math.max(MIN_W, Math.min(MAX_W, Math.round(w * 10) / 10));
    onChange(
      selected.map((s, idx) => (idx === i ? { ...s, weight: clamped } : s)),
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-dim)]">
          Artists · {all.length}명 ({selected.length}/12)
        </label>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[10px] text-[var(--color-fg-mute)] hover:text-[var(--color-danger)]"
          >
            Clear
          </button>
        )}
      </div>

      {selected.length > 0 && (
        <ul className="space-y-1.5">
          {selected.map((sel, i) => (
            <li
              key={`${sel.name}-${i}`}
              className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5"
            >
              <span className="flex-1 truncate font-mono text-xs">{sel.name}</span>
              <button
                type="button"
                aria-label="decrease"
                onClick={() => updateWeight(i, sel.weight - STEP)}
                className="size-6 rounded text-sm text-[var(--color-fg-dim)] hover:bg-[var(--color-bg-elev-2)]"
              >
                −
              </button>
              <input
                type="number"
                value={sel.weight}
                min={MIN_W}
                max={MAX_W}
                step={STEP}
                onChange={(e) => updateWeight(i, Number(e.target.value))}
                className="w-12 rounded border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-1.5 py-0.5 text-center text-xs"
              />
              <button
                type="button"
                aria-label="increase"
                onClick={() => updateWeight(i, sel.weight + STEP)}
                className="size-6 rounded text-sm text-[var(--color-fg-dim)] hover:bg-[var(--color-bg-elev-2)]"
              >
                +
              </button>
              <button
                type="button"
                aria-label="remove"
                onClick={() => removeAt(i)}
                className="size-6 rounded text-sm text-[var(--color-fg-mute)] hover:text-[var(--color-danger)]"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="작가 검색 (예: mx2j, wlop, 또는 한글 이름)"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm placeholder:text-[var(--color-fg-mute)] focus:border-[var(--color-accent)] focus:outline-none"
        />
        {open && results.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-80 w-full overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev)] shadow-2xl">
            {results.map((r) => (
              <li key={r.name}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    add(r);
                  }}
                  className="flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left hover:bg-[var(--color-bg-elev-2)]"
                >
                  <span className="flex flex-1 flex-col">
                    <span className="font-mono text-xs">{r.name}</span>
                    {r.otherNames && r.otherNames.length > 0 && (
                      <span className="truncate text-[10px] text-[var(--color-fg-mute)]">
                        {r.otherNames.slice(0, 3).join(", ")}
                      </span>
                    )}
                  </span>
                  <span className="flex flex-col items-end text-[10px] text-[var(--color-fg-dim)]">
                    <span>{r.usage}× 사용</span>
                    <span>기본 ×{r.defaultWeight}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
