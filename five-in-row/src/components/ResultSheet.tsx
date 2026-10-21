import { useMemo } from "react";
import { ENGINES, playerLabel, type GameSnapshot, type PlayerConfig, type Usage } from "../../shared/types";
import { formatSec, formatTokens, formatUsd, REASON_TEXT } from "../lib/format";
import { Avatar } from "./PlayerBar";

interface ResultSheetProps {
  snap: GameSnapshot;
  humanColor: "w" | "b" | null;
  rematchLabel: string;
  rematchDisabled: boolean;
  onClose: () => void;
  onRematch: () => void;
  onNew: () => void;
  onCopyRecord: () => void;
}

function headline(snap: GameSnapshot, human: "w" | "b" | null) {
  if (snap.result === "*") return { title: "대국 취소", tone: "draw" as const, emoji: "⏸" };
  if (snap.result === "draw") return { title: "무승부", tone: "draw" as const, emoji: "🤝" };
  const winner = snap.result === "w" ? "w" : "b";
  if (human) return winner === human ? { title: "승리!", tone: "win" as const, emoji: "🏆" } : { title: "패배", tone: "lose" as const, emoji: "😵" };
  const p = winner === "w" ? snap.white : snap.black;
  return { title: `${playerLabel(p)} 승리`, tone: "win" as const, emoji: "🏆" };
}

/** Black (first player) on the left. */
function Row({ label, w, b, fmt }: { label: string; w: number; b: number; fmt: (n: number) => string }) {
  return (
    <tr>
      <td className={b > w ? "hi" : undefined}>{fmt(b)}</td>
      <th>{label}</th>
      <td className={w > b ? "hi" : undefined}>{fmt(w)}</td>
    </tr>
  );
}

function name(p: PlayerConfig) {
  return p.kind === "ai" ? ENGINES[p.engine].name : playerLabel(p);
}

export function ResultSheet({ snap, humanColor, rematchLabel, rematchDisabled, onClose, onRematch, onNew, onCopyRecord }: ResultSheetProps) {
  const h = headline(snap, humanColor);
  const { w, b } = snap.usage;
  const total = w.costUsd + b.costUsd;
  const tokens = w.inputTokens + w.outputTokens + b.inputTokens + b.outputTokens;
  const avg = (u: Usage) => (u.calls ? u.thinkMs / u.calls : 0);
  const confetti = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.3,
        hue: ["#58cc02", "#1cb0f6", "#ffc800", "#ff4b4b", "#ce82ff"][i % 5],
        rot: Math.random() * 360,
        dx: (Math.random() - 0.5) * 120,
      })),
    [],
  );

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      {h.tone === "win" && humanColor && (
        <div className="confetti" aria-hidden="true">
          {confetti.map((c, i) => (
            <i
              key={i}
              style={{ left: `${c.left}%`, background: c.hue, animationDelay: `${c.delay}s`, ["--rot" as string]: `${c.rot}deg`, ["--dx" as string]: `${c.dx}px` }}
            />
          ))}
        </div>
      )}
      <div className={`sheet result ${h.tone}`} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="result-emoji">{h.emoji}</div>
        <h2>{h.title}</h2>
        <p className="result-reason">
          {snap.reason ? REASON_TEXT[snap.reason] : ""} · {snap.moves.length}수
        </p>

        {snap.mode !== "pvp" && (
        <>
        <div className="cost-hero">
          <div>
            <span className="cost-label">총 API 비용</span>
            <strong>{formatUsd(total)}</strong>
          </div>
          <div>
            <span className="cost-label">총 토큰</span>
            <strong>{formatTokens(tokens)}</strong>
          </div>
        </div>

        <table className="usage-table">
          <thead>
            <tr>
              <td>
                <div className="usage-head">
                  <Avatar player={snap.black} size={32} />
                  <span>{name(snap.black)} <small>흑</small></span>
                </div>
              </td>
              <th />
              <td>
                <div className="usage-head">
                  <Avatar player={snap.white} size={32} />
                  <span>{name(snap.white)} <small>백</small></span>
                </div>
              </td>
            </tr>
          </thead>
          <tbody>
            <Row label="비용" w={w.costUsd} b={b.costUsd} fmt={formatUsd} />
            <Row label="입력 토큰" w={w.inputTokens} b={b.inputTokens} fmt={formatTokens} />
            <Row label="출력 토큰" w={w.outputTokens} b={b.outputTokens} fmt={formatTokens} />
            <Row label="API 호출" w={w.calls} b={b.calls} fmt={String} />
            <Row label="총 생각 시간" w={w.thinkMs} b={b.thinkMs} fmt={formatSec} />
            <Row label="평균 응답" w={avg(w)} b={avg(b)} fmt={formatSec} />
            {(w.errors + b.errors > 0) && <Row label="API 오류" w={w.errors} b={b.errors} fmt={String} />}
            {(w.fallbacks + b.fallbacks > 0) && <Row label="무작위 대체 수" w={w.fallbacks} b={b.fallbacks} fmt={String} />}
          </tbody>
        </table>
        </>
        )}

        <div className="sheet-actions">
          <button className="btn primary" disabled={rematchDisabled} onClick={onRematch}>{rematchLabel}</button>
          <button className="btn" onClick={onNew}>새 대국</button>
        </div>
        <div className="sheet-actions minor">
          <button className="link" onClick={onClose}>기보 다시 보기</button>
          <button className="link" onClick={onCopyRecord}>기보 복사</button>
        </div>
      </div>
    </div>
  );
}
