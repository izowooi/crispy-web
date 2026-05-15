"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CharacterRow } from "@/lib/types";
import { createCharacterSearcher } from "@/lib/character-search";

type Props = {
  selected: CharacterRow[];
  onChange: (next: CharacterRow[]) => void;
};

export function CharacterSearch({ selected, onChange }: Props) {
  const [all, setAll] = useState<CharacterRow[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/characters.json")
      .then((r) => r.json())
      .then((rows) => setAll(rows as CharacterRow[]))
      .catch(() => setAll([]));
  }, []);

  const searcher = useMemo(() => createCharacterSearcher(all), [all]);
  const results = useMemo(() => searcher.search(query, { limit: 25 }), [searcher, query]);

  function add(row: CharacterRow) {
    if (selected.some((c) => c.eng === row.eng)) return;
    onChange([...selected, row]);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  }

  function remove(row: CharacterRow) {
    onChange(selected.filter((c) => c.eng !== row.eng));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-[var(--color-fg-dim)]">
          캐릭터 검색 · {all.length.toLocaleString()}개
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {selected.map((c) => (
          <span
            key={c.eng}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-bg-elev-2)] px-3 py-1 text-sm"
          >
            <span className="text-[var(--color-fg)]">{c.kor}</span>
            <span className="text-xs text-[var(--color-fg-dim)]">{c.work}</span>
            <button
              type="button"
              aria-label={`Remove ${c.kor}`}
              onClick={() => remove(c)}
              className="ml-1 rounded-full text-[var(--color-fg-dim)] hover:text-[var(--color-accent)]"
            >
              ✕
            </button>
          </span>
        ))}
      </div>

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
          placeholder="한글/영문/작품명으로 검색 (예: 프리렌, hu_tao, 원신)"
          className="w-full rounded-lg border border-[var(--color-bg-elev-2)] bg-[var(--color-bg-elev)] px-4 py-2 text-[var(--color-fg)] placeholder:text-[var(--color-fg-dim)] focus:border-[var(--color-accent)] focus:outline-none"
        />
        {open && results.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-80 w-full overflow-auto rounded-lg border border-[var(--color-bg-elev-2)] bg-[var(--color-bg-elev)] shadow-2xl">
            {results.map((r) => (
              <li key={r.eng}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    add(r);
                  }}
                  className="flex w-full items-center justify-between gap-4 px-4 py-2 text-left hover:bg-[var(--color-bg-elev-2)]"
                >
                  <span className="flex flex-col">
                    <span className="text-[var(--color-fg)]">{r.kor}</span>
                    <span className="text-xs text-[var(--color-fg-dim)]">{r.work}</span>
                  </span>
                  <span className="font-mono text-xs text-[var(--color-accent)]">{r.eng}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
