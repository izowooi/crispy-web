"use client";

import { useMemo, useState } from "react";
import {
  CATEGORIES,
  STYLES,
  type StyleCategoryId,
  type StyleMeta,
} from "@/config/styles";

export type StylePickerProps = {
  selectedIds: string[];
  onChange: (next: string[]) => void;
  /** Allow-list of style ids. `undefined` ⇒ all enabled. Empty array ⇒ none enabled. */
  enabledStyleIds?: string[];
  /** Optional global ordering of styles (RC.style_order). When given, styles are
   *  reordered *within* their category to match this list before rendering. */
  styleOrder?: string[];
  /** Optional hard cap on number of selected styles. Default: unlimited. */
  maxSelection?: number;
  className?: string;
};

export function StylePicker({
  selectedIds,
  onChange,
  enabledStyleIds,
  styleOrder,
  maxSelection,
  className = "",
}: StylePickerProps) {
  const [activeTab, setActiveTab] = useState<StyleCategoryId>(
    CATEGORIES[0].id,
  );

  const enabledSet = useMemo<ReadonlySet<string> | null>(() => {
    if (enabledStyleIds === undefined) return null; // no filtering
    return new Set(enabledStyleIds);
  }, [enabledStyleIds]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  // Build the ordered list of styles for the active tab.
  const visibleStyles = useMemo<readonly StyleMeta[]>(() => {
    const inCat = STYLES.filter((s) => s.category === activeTab);
    if (!styleOrder || styleOrder.length === 0) return inCat;
    const orderIdx = new Map(styleOrder.map((id, idx) => [id, idx] as const));
    const sorted = [...inCat].sort((a, b) => {
      const ai = orderIdx.has(a.id) ? orderIdx.get(a.id)! : Number.MAX_SAFE_INTEGER;
      const bi = orderIdx.has(b.id) ? orderIdx.get(b.id)! : Number.MAX_SAFE_INTEGER;
      return ai - bi;
    });
    return sorted;
  }, [activeTab, styleOrder]);

  const isEnabled = (id: string): boolean => {
    if (enabledSet === null) return true;
    return enabledSet.has(id);
  };

  const atCap = (): boolean =>
    typeof maxSelection === "number" && selectedIds.length >= maxSelection;

  const toggleStyle = (id: string) => {
    if (!isEnabled(id)) return;
    if (selectedSet.has(id)) {
      // always allow deselect
      onChange(selectedIds.filter((x) => x !== id));
      return;
    }
    if (atCap()) return;
    onChange([...selectedIds, id]);
  };

  const handleSelectAllInTab = () => {
    const additions: string[] = [];
    for (const s of visibleStyles) {
      if (!isEnabled(s.id)) continue;
      if (selectedSet.has(s.id)) continue;
      additions.push(s.id);
    }
    if (additions.length === 0) return;

    let next = [...selectedIds, ...additions];
    if (typeof maxSelection === "number" && next.length > maxSelection) {
      next = next.slice(0, maxSelection);
    }
    onChange(next);
  };

  const handleClearInTab = () => {
    const inTab = new Set(visibleStyles.map((s) => s.id));
    const next = selectedIds.filter((id) => !inTab.has(id));
    if (next.length === selectedIds.length) return;
    onChange(next);
  };

  return (
    <div className={["w-full", className].filter(Boolean).join(" ")}>
      {/* Tab bar */}
      <div
        role="tablist"
        className="flex flex-wrap gap-1 border-b border-border"
      >
        {CATEGORIES.map((cat) => {
          const active = cat.id === activeTab;
          return (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={active}
              data-testid={`style-tab-${cat.id}`}
              onClick={() => setActiveTab(cat.id)}
              className={[
                "px-3 py-2 text-sm font-medium transition-colors",
                "border-b-2 -mb-px",
                active
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-foreground",
              ].join(" ")}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Bulk actions */}
      <div className="flex items-center justify-between gap-2 mt-3 mb-2">
        <div className="text-xs text-muted">
          {selectedIds.length}개 선택됨
          {typeof maxSelection === "number" ? ` / 최대 ${maxSelection}` : ""}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="style-bulk-select"
            onClick={handleSelectAllInTab}
            className="text-xs px-2 py-1 rounded-md border border-border hover:border-accent hover:text-accent transition-colors"
          >
            현재 탭 전체 선택
          </button>
          <button
            type="button"
            data-testid="style-bulk-clear"
            onClick={handleClearInTab}
            className="text-xs px-2 py-1 rounded-md border border-border hover:border-accent hover:text-accent transition-colors"
          >
            현재 탭 해제
          </button>
        </div>
      </div>

      {/* Style grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {visibleStyles.map((s) => {
          const selected = selectedSet.has(s.id);
          const enabled = isEnabled(s.id);
          const capBlocked = !selected && atCap();
          const interactable = enabled && !capBlocked;

          const base = [
            "relative text-left rounded-xl border p-3 transition-colors",
            "flex flex-col gap-1 h-full min-h-[88px]",
          ];

          const variant = !enabled
            ? "border-border bg-card opacity-50 cursor-not-allowed"
            : selected
            ? "border-accent bg-accent/10 text-foreground"
            : capBlocked
            ? "border-border bg-card opacity-60 cursor-not-allowed"
            : "border-border bg-card hover:border-accent text-foreground cursor-pointer";

          return (
            <button
              key={s.id}
              type="button"
              data-testid={`style-card-${s.id}`}
              data-selected={selected}
              data-enabled={enabled}
              aria-pressed={selected}
              aria-disabled={!interactable}
              onClick={() => toggleStyle(s.id)}
              className={[...base, variant].join(" ")}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-medium leading-tight">
                  {s.label}
                </div>
                <CheckBadge selected={selected} />
              </div>
              <div className="text-xs text-muted leading-snug">
                {s.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CheckBadge({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={[
        "inline-flex items-center justify-center shrink-0",
        "w-5 h-5 rounded-full border text-[10px] font-bold",
        selected
          ? "bg-accent border-accent text-white"
          : "bg-transparent border-border text-transparent",
      ].join(" ")}
    >
      {selected ? "✓" : ""}
    </span>
  );
}
