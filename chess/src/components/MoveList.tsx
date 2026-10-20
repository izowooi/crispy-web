import { useEffect, useRef } from "react";
import type { MoveRecord } from "../../shared/types";

interface MoveListProps {
  moves: MoveRecord[];
  /** Index of the ply being shown; moves.length - 1 means live. */
  current: number;
  onSelect: (ply: number) => void;
  layout: "strip" | "table";
}

function Meta({ m }: { m: MoveRecord }) {
  return (
    <span className="move-meta">
      {(m.thinkMs / 1000).toFixed(1)}s{m.confidence !== undefined && ` · ${Math.round(m.confidence * 100)}%`}
    </span>
  );
}

export function MoveList({ moves, current, onSelect, layout }: MoveListProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>(".mv.current");
    if (!el || !ref.current) return;
    const box = ref.current;
    if (layout === "strip") box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2, behavior: "smooth" });
    else box.scrollTo({ top: el.offsetTop - box.clientHeight / 2, behavior: "smooth" });
  }, [current, moves.length, layout]);

  const cell = (m: MoveRecord | undefined, i: number) =>
    m ? (
      <button
        key={i}
        className={`mv${i === current ? " current" : ""}${m.fallback ? " fallback" : ""}`}
        onClick={() => onSelect(i)}
        title={m.comment ?? (m.fallback ? "API 실패로 무작위 수" : undefined)}
      >
        <span className="san">{m.san}</span>
        {layout === "table" && <Meta m={m} />}
      </button>
    ) : (
      <span key={i} className="mv empty" />
    );

  if (layout === "strip") {
    return (
      <div className="move-strip" ref={ref}>
        {moves.length === 0 && <span className="move-empty">첫 수를 기다리는 중…</span>}
        {moves.map((m, i) => (
          <span key={i} className="strip-item">
            {i % 2 === 0 && <span className="no">{i / 2 + 1}.</span>}
            {cell(m, i)}
          </span>
        ))}
      </div>
    );
  }

  const rows = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push(
      <div className="move-row" key={i}>
        <span className="no">{i / 2 + 1}</span>
        {cell(moves[i], i)}
        {cell(moves[i + 1], i + 1)}
      </div>,
    );
  }
  return (
    <div className="move-table" ref={ref}>
      {moves.length === 0 ? <div className="move-empty">첫 수를 기다리는 중…</div> : rows}
    </div>
  );
}
