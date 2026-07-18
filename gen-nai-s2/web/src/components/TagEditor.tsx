"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type TagItem = [string, number, number];
const typeNames = ["general", "meta", "character", "copyright", "artist"];

function tokenRange(value: string, caret: number): [number, number] {
  let start = caret;
  while (start > 0 && value[start - 1] !== "," && value[start - 1] !== "\n") start--;
  let end = caret;
  while (end < value.length && value[end] !== "," && value[end] !== "\n") end++;
  return [start, end];
}

export function TagEditor({ label, value, onChange, rows = 7 }: { label: string; value: string; onChange(value: string): void; rows?: number }) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const worker = useRef<Worker | null>(null);
  const seq = useRef(0);
  const [items, setItems] = useState<TagItem[]>([]);
  const [active, setActive] = useState(0);
  const [range, setRange] = useState<[number, number]>([0, 0]);
  const tags = useMemo(() => value.split(",").map((tag) => tag.trim()).filter(Boolean), [value]);

  useEffect(() => {
    const instance = new Worker(new URL("../workers/tag-search.worker.ts", import.meta.url));
    instance.onmessage = (event: MessageEvent<{ id: number; items?: TagItem[] }>) => {
      if (event.data.id === seq.current) { setItems(event.data.items ?? []); setActive(0); }
    };
    worker.current = instance;
    return () => instance.terminate();
  }, []);

  function search(caret: number) {
    const nextRange = tokenRange(value, caret);
    setRange(nextRange);
    const query = value.slice(...nextRange).trim();
    const id = ++seq.current;
    if (query.length < 2) { setItems([]); return; }
    window.setTimeout(() => worker.current?.postMessage({ id, query, limit: 8 }), 100);
  }

  function choose(tag: string) {
    const before = value.slice(0, range[0]);
    const after = value.slice(range[1]).replace(/^\s*/, "");
    const separator = after.startsWith(",") || after.startsWith("\n") || !after ? "" : ", ";
    const next = `${before}${before && !/[\n,]\s*$/.test(before) ? " " : ""}${tag}${separator}${after}`;
    onChange(next);
    setItems([]);
    requestAnimationFrame(() => textarea.current?.focus());
  }

  return <div className="relative">
    <div className="mb-2 flex items-center justify-between"><label className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</label><span className="text-[11px] text-gray-400">{tags.length} tags</span></div>
    <textarea ref={textarea} rows={rows} value={value} onChange={(e) => { onChange(e.target.value); requestAnimationFrame(() => search(e.target.selectionStart)); }} onClick={(e) => search(e.currentTarget.selectionStart)} onKeyDown={(e) => {
      if (!items.length) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setActive((x) => (x + 1) % items.length); }
      if (e.key === "ArrowUp") { e.preventDefault(); setActive((x) => (x - 1 + items.length) % items.length); }
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); choose(items[active][0]); }
      if (e.key === "Escape") setItems([]);
    }} className="w-full resize-y rounded-xl border border-gray-200 bg-white p-3 font-mono text-xs leading-6 outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-950" />
    {items.length > 0 && <div className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-gray-200 bg-white p-1 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
      {items.map((item, index) => <button type="button" key={item[0]} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(item[0])} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs ${active === index ? "bg-violet-50 dark:bg-violet-950" : "hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
        <span className="min-w-0 flex-1 truncate font-mono">{item[0]}</span><span className="text-gray-400">{item[1].toLocaleString()}</span><span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] dark:bg-gray-800">{typeNames[item[2]]}</span>
      </button>)}
    </div>}
  </div>;
}
