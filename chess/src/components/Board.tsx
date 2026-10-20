import { Chess, type Square } from "chess.js";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { PieceSvg, type PieceColor, type PieceType } from "./Piece";

const FILES = "abcdefgh";

interface Placed {
  id: number;
  type: PieceType;
  color: PieceColor;
  sq: string;
  dying?: boolean;
}

interface BoardProps {
  fen: string;
  orientation: PieceColor;
  lastMove?: { from: string; to: string } | null;
  /** Side the user may move right now, or null when the board is read-only. */
  movable: PieceColor | null;
  onMove?: (from: string, to: string, promotion?: string) => void;
  /** False when jumping several plies at once, so pieces don't fly across the board. */
  animate?: boolean;
}

let nextId = 1;

function readBoard(fen: string): Omit<Placed, "id">[] {
  const out: Omit<Placed, "id">[] = [];
  new Chess(fen).board().forEach((row) =>
    row.forEach((p) => p && out.push({ type: p.type as PieceType, color: p.color as PieceColor, sq: p.square })),
  );
  return out;
}

function dist(a: string, b: string) {
  return Math.abs(a.charCodeAt(0) - b.charCodeAt(0)) + Math.abs(Number(a[1]) - Number(b[1]));
}

/** Match pieces between positions so the moved ones keep their identity (and slide). */
function reconcile(prev: Placed[], fen: string, lastMove?: { from: string; to: string } | null): Placed[] {
  const live = prev.filter((p) => !p.dying);
  const next = readBoard(fen);
  const used = new Set<number>();
  const result: (Placed | null)[] = next.map(() => null);

  next.forEach((n, i) => {
    const same = live.find((p) => !used.has(p.id) && p.sq === n.sq && p.type === n.type && p.color === n.color);
    if (same) {
      used.add(same.id);
      result[i] = same;
    }
  });
  next.forEach((n, i) => {
    if (result[i]) return;
    const pool = live.filter((p) => !used.has(p.id) && p.color === n.color && p.type === n.type);
    pool.sort((a, b) => (a.sq === lastMove?.from ? -1 : b.sq === lastMove?.from ? 1 : dist(a.sq, n.sq) - dist(b.sq, n.sq)));
    let match: Placed | undefined = pool[0];
    if (!match && lastMove && n.sq === lastMove.to) {
      match = live.find((p) => !used.has(p.id) && p.sq === lastMove.from && p.color === n.color);
    }
    if (match) {
      used.add(match.id);
      result[i] = { ...match, sq: n.sq, type: n.type };
    } else {
      result[i] = { id: nextId++, ...n };
    }
  });
  const dying = live.filter((p) => !used.has(p.id)).map((p) => ({ ...p, dying: true }));
  return [...(result as Placed[]), ...dying];
}

export function Board({ fen, orientation, lastMove, movable, onMove, animate = true }: BoardProps) {
  const chess = useMemo(() => new Chess(fen), [fen]);
  const [pieces, setPieces] = useState<Placed[]>(() => readBoard(fen).map((p) => ({ id: nextId++, ...p })));
  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: number; x: number; y: number } | null>(null);
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const pressRef = useRef<{ sq: string; wasSelected: boolean; moved: boolean; startX: number; startY: number } | null>(null);

  useLayoutEffect(() => {
    setPieces((prev) => reconcile(prev, fen, lastMove));
    setSelected(null);
    setPromo(null);
  }, [fen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!pieces.some((p) => p.dying)) return;
    const t = setTimeout(() => setPieces((prev) => prev.filter((p) => !p.dying)), 260);
    return () => clearTimeout(t);
  }, [pieces]);

  const canMove = movable !== null && chess.turn() === movable && !chess.isGameOver();
  const targets = useMemo(() => {
    if (!selected || !canMove) return new Map<string, boolean>();
    return new Map(chess.moves({ square: selected as Square, verbose: true }).map((m) => [m.to, Boolean(m.captured)]));
  }, [selected, canMove, chess]);

  const checkSq = useMemo(() => {
    if (!chess.inCheck()) return null;
    const king = chess.board().flat().find((p) => p && p.type === "k" && p.color === chess.turn());
    return king?.square ?? null;
  }, [chess]);

  const toXY = (sq: string) => {
    const f = FILES.indexOf(sq[0]);
    const r = Number(sq[1]) - 1;
    return orientation === "w" ? { col: f, row: 7 - r } : { col: 7 - f, row: r };
  };
  const fromPoint = (clientX: number, clientY: number): string | null => {
    const rect = boardRef.current!.getBoundingClientRect();
    const col = Math.floor(((clientX - rect.left) / rect.width) * 8);
    const row = Math.floor(((clientY - rect.top) / rect.height) * 8);
    if (col < 0 || col > 7 || row < 0 || row > 7) return null;
    return orientation === "w" ? `${FILES[col]}${8 - row}` : `${FILES[7 - col]}${row + 1}`;
  };

  const ownPieceAt = (sq: string) => {
    const p = chess.get(sq as Square);
    return p && p.color === movable ? p : null;
  };

  const tryMove = (from: string, to: string) => {
    const move = chess.moves({ square: from as Square, verbose: true }).find((m) => m.to === to);
    if (!move) return false;
    if (move.promotion) {
      setPromo({ from, to });
      return true;
    }
    setSelected(null);
    onMove?.(from, to);
    return true;
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    if (!canMove || promo || e.button !== 0) return;
    const sq = fromPoint(e.clientX, e.clientY);
    if (!sq) return;
    if (selected && sq !== selected && targets.has(sq)) {
      tryMove(selected, sq);
      return;
    }
    if (ownPieceAt(sq)) {
      const wasSelected = selected === sq;
      setSelected(sq);
      pressRef.current = { sq, wasSelected, moved: false, startX: e.clientX, startY: e.clientY };
      boardRef.current!.setPointerCapture(e.pointerId);
      return;
    }
    setSelected(null);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const press = pressRef.current;
    if (!press) return;
    if (!press.moved && Math.hypot(e.clientX - press.startX, e.clientY - press.startY) < 4) return;
    press.moved = true;
    const piece = pieces.find((p) => p.sq === press.sq && !p.dying);
    if (!piece) return;
    const rect = boardRef.current!.getBoundingClientRect();
    setDrag({ id: piece.id, x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    const press = pressRef.current;
    pressRef.current = null;
    setDrag(null);
    if (!press) return;
    const sq = fromPoint(e.clientX, e.clientY);
    if (press.moved) {
      if (sq && sq !== press.sq && tryMove(press.sq, sq)) return;
      return;
    }
    if (press.wasSelected) setSelected(null);
  };

  const squares = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const sq = orientation === "w" ? `${FILES[col]}${8 - row}` : `${FILES[7 - col]}${row + 1}`;
      const dark = (row + col) % 2 === 1;
      const classes = ["sq", dark ? "dark" : "light"];
      if (lastMove && (sq === lastMove.from || sq === lastMove.to)) classes.push("last");
      if (sq === selected) classes.push("selected");
      if (sq === checkSq) classes.push("check");
      squares.push(
        <div key={sq} className={classes.join(" ")}>
          {col === 0 && <span className="coord rank">{sq[1]}</span>}
          {row === 7 && <span className="coord file">{sq[0]}</span>}
          {targets.has(sq) && <span className={targets.get(sq) ? "hint capture" : "hint"} />}
        </div>,
      );
    }
  }

  const promoColor = chess.turn();
  return (
    <div
      ref={boardRef}
      className={`board${animate ? "" : " no-anim"}${canMove ? " movable" : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        pressRef.current = null;
        setDrag(null);
      }}
    >
      <div className="squares">{squares}</div>
      <div className="pieces">
        {pieces.map((p) => {
          const { col, row } = toXY(p.sq);
          const dragging = drag?.id === p.id;
          const style = dragging
            ? { transform: `translate(calc(${drag.x}px - 50%), calc(${drag.y}px - 50%)) scale(1.12)` }
            : { transform: `translate(${col * 100}%, ${row * 100}%)` };
          return (
            <div
              key={p.id}
              className={`piece${dragging ? " dragging" : ""}${p.dying ? " dying" : ""}${p.sq === checkSq ? " in-check" : ""}`}
              style={style}
            >
              <PieceSvg type={p.type} color={p.color} />
            </div>
          );
        })}
      </div>
      {promo && (
        <div className="promo-backdrop" onPointerDown={(e) => { e.stopPropagation(); setPromo(null); }}>
          <div
            className="promo"
            style={{
              left: `${toXY(promo.to).col * 12.5}%`,
              ...(toXY(promo.to).row === 0 ? { top: 0 } : { bottom: 0, flexDirection: "column-reverse" }),
            }}
          >
            {(["q", "n", "r", "b"] as const).map((t) => (
              <button
                key={t}
                className="promo-option"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  const { from, to } = promo;
                  setPromo(null);
                  setSelected(null);
                  onMove?.(from, to, t);
                }}
              >
                <PieceSvg type={t} color={promoColor} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
