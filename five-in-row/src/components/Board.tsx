import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { COLS, gridFrom, pointName, SIZE } from "../../shared/omok";
import type { Color } from "../../shared/types";
import { StoneSvg } from "./Stone";

const STARS = ["D4", "L4", "H8", "D12", "L12"];
const CELL = 100 / SIZE;

interface BoardProps {
  /** Moves shown on the board, black first. */
  points: string[];
  /** Highlighted winning line, if any. */
  winLine?: string[] | null;
  /** Color the user may place right now, or null when the board is read-only. */
  movable: Color | null;
  /** Points `movable` may not play (double-three). */
  forbidden?: string[];
  /** Touch preview waiting for a confirming second tap. */
  preview: string | null;
  onPreview: (point: string | null) => void;
  onPlace: (point: string) => void;
  onForbidden?: () => void;
}

function xy(point: string) {
  const x = COLS.indexOf(point[0]);
  const y = Number(point.slice(1)) - 1;
  return { left: `${x * CELL}%`, top: `${(SIZE - 1 - y) * CELL}%` };
}

export function Board({ points, winLine, movable, forbidden = [], preview, onPreview, onPlace, onForbidden }: BoardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<string | null>(null);
  const grid = useMemo(() => gridFrom(points), [points]);
  const forbiddenSet = useMemo(() => new Set(forbidden), [forbidden]);
  const winSet = useMemo(() => new Set(winLine ?? []), [winLine]);
  const last = points[points.length - 1];

  const pointAt = (clientX: number, clientY: number): string | null => {
    const rect = ref.current!.getBoundingClientRect();
    const x = Math.floor(((clientX - rect.left) / rect.width) * SIZE);
    const y = SIZE - 1 - Math.floor(((clientY - rect.top) / rect.height) * SIZE);
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return null;
    return pointName(x, y);
  };
  const empty = (p: string) => {
    const x = COLS.indexOf(p[0]);
    const y = Number(p.slice(1)) - 1;
    return grid[y * SIZE + x] === null;
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    if (!movable || e.button !== 0) return;
    const p = pointAt(e.clientX, e.clientY);
    if (!p || !empty(p)) {
      onPreview(null);
      return;
    }
    if (forbiddenSet.has(p)) {
      onPreview(null);
      onForbidden?.();
      return;
    }
    // A mouse is precise enough to place on click; fingers get a preview first.
    if (e.pointerType === "mouse" || preview === p) onPlace(p);
    else onPreview(p);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (e.pointerType !== "mouse" || !movable) return;
    const p = pointAt(e.clientX, e.clientY);
    setHover(p && empty(p) && !forbiddenSet.has(p) ? p : null);
  };

  const ghost = movable ? (preview ?? hover) : null;

  return (
    <div className="goban-frame">
      <div
        ref={ref}
        className={`goban${movable ? " movable" : ""}`}
        onPointerUp={onPointerUp}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHover(null)}
      >
        <svg className="goban-lines" viewBox={`0 0 ${SIZE} ${SIZE}`} preserveAspectRatio="none" aria-hidden="true">
          {Array.from({ length: SIZE }, (_, i) => (
            <g key={i}>
              <line x1={0.5} x2={SIZE - 0.5} y1={i + 0.5} y2={i + 0.5} />
              <line y1={0.5} y2={SIZE - 0.5} x1={i + 0.5} x2={i + 0.5} />
            </g>
          ))}
          {STARS.map((s) => {
            const x = COLS.indexOf(s[0]);
            const y = SIZE - Number(s.slice(1));
            return <circle key={s} className="star" cx={x + 0.5} cy={y + 0.5} r={0.12} />;
          })}
        </svg>
        {Array.from({ length: SIZE }, (_, i) => (
          <span key={`c${i}`} className="goban-coord col" style={{ left: `${(i + 0.5) * CELL}%` }}>{COLS[i]}</span>
        ))}
        {Array.from({ length: SIZE }, (_, i) => (
          <span key={`r${i}`} className="goban-coord row" style={{ top: `${(SIZE - 0.5 - i) * CELL}%` }}>{i + 1}</span>
        ))}
        {movable &&
          forbidden.map((p) => (
            <span key={`f${p}`} className="forbid" style={xy(p)} title="쌍삼 금지">×</span>
          ))}
        {points.map((p, i) => (
          <div key={p} className={`stone${p === last ? " last" : ""}${winSet.has(p) ? " win" : ""}`} style={xy(p)}>
            <StoneSvg color={i % 2 === 0 ? "b" : "w"} />
            {p === last && !winSet.size && <i className="last-dot" />}
          </div>
        ))}
        {ghost && (
          <div className={`stone ghost${preview ? " preview" : ""}`} style={xy(ghost)}>
            <StoneSvg color={movable!} />
          </div>
        )}
      </div>
    </div>
  );
}
