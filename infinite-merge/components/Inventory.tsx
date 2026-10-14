"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import type { ElementView } from "@/lib/types";
import { tintOf } from "./tint";

type Sort = "time" | "name" | "first";

const SORTS: { key: Sort; label: string }[] = [
  { key: "time", label: "발견순" },
  { key: "name", label: "가나다" },
  { key: "first", label: "최초 발견" },
];

type Props = {
  ref: React.Ref<HTMLDivElement>;
  elements: ElementView[];
  fresh: Set<string>;
  dropActive: boolean;
  lastResult: ElementView | null;
  disabled: boolean;
  onChipPointerDown: (e: React.PointerEvent, element: ElementView) => void;
};

export function Inventory({ ref, elements, fresh, dropActive, lastResult, disabled, onChipPointerDown }: Props) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("time");

  const visible = useMemo(() => {
    const q = query.trim();
    let list = q ? elements.filter((e) => matches(e.name, q)) : elements;
    if (sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name, "ko"));
    if (sort === "first") list = list.filter((e) => e.firstDiscovery);
    return list;
  }, [elements, query, sort]);

  return (
    <aside
      ref={ref}
      className="glass absolute inset-x-0 bottom-0 z-30 flex h-[42dvh] flex-col rounded-t-3xl pb-[env(safe-area-inset-bottom)] md:inset-x-auto md:bottom-3 md:right-3 md:top-[76px] md:h-auto md:w-[var(--panel-w)] md:rounded-3xl"
    >
      <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/15 md:hidden" />
      <div className="flex items-center gap-2 px-4 pb-2 pt-3">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="9" cy="9" r="6" />
            <path d="m14 14 4 4" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`${elements.length}개의 원소 검색 (초성 가능)`}
            className="h-10 w-full rounded-xl border border-white/8 bg-white/[0.04] pl-9 pr-3 text-sm outline-none placeholder:text-white/35 focus:border-white/25 focus:bg-white/[0.07]"
          />
        </div>
      </div>
      <div className="flex gap-1 px-4 pb-2">
        {SORTS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSort(s.key)}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              sort === s.key ? "bg-white/12 text-white" : "text-white/45 hover:text-white/80"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="scroll-thin relative flex-1 overflow-y-auto px-3 pb-3">
        <div className="flex flex-wrap content-start gap-1.5">
          {visible.map((el) => (
            <div
              key={el.name}
              title={el.desc}
              data-chip={el.name}
              onPointerDown={disabled ? undefined : (e) => onChipPointerDown(e, el)}
              onContextMenu={(e) => e.preventDefault()}
              className={`tile !h-9 !gap-1.5 !rounded-xl !px-2.5 !text-[0.86rem] ${
                disabled ? "opacity-50" : "cursor-grab active:cursor-grabbing"
              } ${fresh.has(el.name) ? "chip-new" : ""}`}
              style={
                {
                  "--tint": tintOf(el.name),
                  touchAction: "pan-y",
                  WebkitTouchCallout: "none",
                } as React.CSSProperties
              }
            >
              <span className="tile__emoji !text-base">{el.emoji}</span>
              <span>{el.name}</span>
              {el.hanja && <span className="tile__hanja">{el.hanja}</span>}
              {el.firstDiscovery && <span className="text-[0.62rem] text-gold">✦</span>}
            </div>
          ))}
          {visible.length === 0 && (
            <p className="w-full py-8 text-center text-sm text-white/40">
              {sort === "first" ? "아직 세계 최초로 만든 원소가 없어요" : "찾는 원소가 없어요"}
            </p>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {lastResult && (
          <motion.div
            key={lastResult.name}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="hidden border-t border-white/6 px-4 py-3 md:block"
          >
            <p className="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-white/35">최근 연성</p>
            <div className="mt-1 flex items-start gap-2.5">
              <span className="text-2xl leading-none">{lastResult.emoji}</span>
              <div className="min-w-0">
                <p className="font-bold">
                  {lastResult.name}
                  {lastResult.firstDiscovery && <span className="ml-1.5 text-xs text-gold">✦ 최초</span>}
                </p>
                {lastResult.desc && <p className="text-sm leading-snug text-white/55">{lastResult.desc}</p>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {dropActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 grid place-items-center rounded-[inherit] border-2 border-dashed border-white/25 bg-ink-950/70"
          >
            <p className="text-sm font-medium text-white/70">놓으면 보드에서 치워져요</p>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}

const CHOSUNG = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";

function chosungOf(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.charCodeAt(0) - 0xac00;
    out += code >= 0 && code < 11172 ? CHOSUNG[Math.floor(code / 588)] : ch;
  }
  return out;
}

function matches(name: string, query: string): boolean {
  if (name.includes(query)) return true;
  const onlyChosung = [...query].every((c) => CHOSUNG.includes(c) || c === " ");
  return onlyChosung && chosungOf(name).includes(query);
}
