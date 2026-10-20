import { ENGINES, playerLabel, variantLabel, type PlayerConfig, type Usage } from "../../shared/types";
import { formatClock, formatUsd } from "../lib/format";
import { PieceSvg, type PieceColor, type PieceType } from "./Piece";
import { IconUser } from "./Icons";

const START: Record<Exclude<PieceType, "k">, number> = { q: 1, r: 2, b: 2, n: 2, p: 8 };
const VALUE: Record<Exclude<PieceType, "k">, number> = { q: 9, r: 5, b: 3, n: 3, p: 1 };

/** Pieces of `victim` color missing from the board, plus the material lead of the capturer. */
export function captured(fen: string, victim: PieceColor) {
  const counts: Record<string, number> = {};
  for (const ch of fen.split(" ")[0]) {
    if (/[a-z]/i.test(ch)) counts[ch] = (counts[ch] ?? 0) + 1;
  }
  const list: PieceType[] = [];
  let lost = 0;
  let enemyLost = 0;
  for (const t of Object.keys(START) as (keyof typeof START)[]) {
    const mine = counts[victim === "w" ? t.toUpperCase() : t] ?? 0;
    const theirs = counts[victim === "w" ? t : t.toUpperCase()] ?? 0;
    const missing = Math.max(0, START[t] - mine);
    for (let i = 0; i < missing; i++) list.push(t);
    lost += missing * VALUE[t];
    enemyLost += Math.max(0, START[t] - theirs) * VALUE[t];
  }
  return { list, lead: lost - enemyLost };
}

const BADGE = { medium: "MED", high: "HIGH" } as const;

function badge(p: Extract<PlayerConfig, { kind: "ai" }>): string | null {
  return p.effort ? BADGE[p.effort] : null;
}

export function Avatar({ player, size = 44 }: { player: PlayerConfig; size?: number }) {
  if (player.kind === "human") {
    return (
      <div className="avatar human" style={{ width: size, height: size }}>
        <IconUser />
      </div>
    );
  }
  const e = ENGINES[player.engine];
  return (
    <div className="avatar" style={{ width: size, height: size, background: e.color, fontSize: Math.round(size * 0.46) }}>
      <span>{e.name[0]}</span>
      {badge(player) && size >= 34 && <i className="avatar-badge">{badge(player)}</i>}
    </div>
  );
}

interface PlayerBarProps {
  player: PlayerConfig;
  color: PieceColor;
  fen: string;
  clockMs: number;
  running: boolean;
  thinking: boolean;
  usage: Usage;
  bubble?: string | null;
  bubbleKey?: string;
  bubbleTone?: "comment" | "error" | "emote";
  position: "top" | "bottom";
  /** Replaces the name, e.g. for a seat nobody has taken yet. */
  label?: string;
  you?: boolean;
  offline?: boolean;
}

export function PlayerBar(props: PlayerBarProps) {
  const { player, color, fen, clockMs, running, thinking, usage, bubble, position, label, you, offline } = props;
  const opp: PieceColor = color === "w" ? "b" : "w";
  const cap = captured(fen, opp);
  const low = clockMs < 20_000;
  const sub =
    player.kind === "ai" ? (
      <span>
        <span className="vendor">{ENGINES[player.engine].vendor} · </span>
        {variantLabel(player) || ENGINES[player.engine].model}
      </span>
    ) : (
      <span>{color === "w" ? "백" : "흑"}</span>
    );

  return (
    <div className={`player-bar ${position}`}>
      <Avatar player={player} />
      <div className="player-meta">
        <div className="player-name">
          <span className="player-name-text">{label ?? (player.kind === "ai" ? ENGINES[player.engine].name : playerLabel(player))}</span>
          {you && <span className="you-tag">나</span>}
          <span className={`side-dot ${color}`} />
          {offline && <span className="offline-tag">연결 끊김</span>}
        </div>
        <div className="player-sub">
          {sub}
          {player.kind === "ai" && usage.calls > 0 && <span className="cost-chip">{formatUsd(usage.costUsd)}</span>}
        </div>
        <div className="captured">
          {cap.list.map((t, i) => (
            <PieceSvg key={i} type={t} color={opp} className={`cap cap-${t}`} />
          ))}
          {cap.lead > 0 && <span className="lead">+{cap.lead}</span>}
        </div>
      </div>
      <div className={`clock${running ? " running" : ""}${running && low ? " low" : ""}`}>
        {thinking && (
          <span className="thinking-dots" aria-label="생각 중">
            <i />
            <i />
            <i />
          </span>
        )}
        <span className="clock-time">{formatClock(clockMs)}</span>
      </div>
      {bubble && (
        <div key={props.bubbleKey ?? bubble} className={`bubble ${props.bubbleTone ?? "comment"}`}>
          {bubble}
        </div>
      )}
    </div>
  );
}
