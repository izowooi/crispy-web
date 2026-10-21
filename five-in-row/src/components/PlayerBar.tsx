import { COLOR_NAME, ENGINES, playerLabel, variantLabel, type Color, type PlayerConfig, type Usage } from "../../shared/types";
import { formatClock, formatUsd } from "../lib/format";
import { IconUser } from "./Icons";
import { StoneSvg } from "./Stone";

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
  color: Color;
  /** Stones this side has on the board. */
  stones: number;
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
  const { player, color, stones, clockMs, running, thinking, usage, bubble, position, label, you, offline } = props;
  const low = clockMs < 20_000;
  const sub =
    player.kind === "ai" ? (
      <span>
        <span className="vendor">{ENGINES[player.engine].vendor} · </span>
        {variantLabel(player) || ENGINES[player.engine].model}
      </span>
    ) : (
      <span>{COLOR_NAME[color]}{color === "b" ? " · 먼저 둠" : ""}</span>
    );

  return (
    <div className={`player-bar ${position}`}>
      <Avatar player={player} />
      <div className="player-meta">
        <div className="player-name">
          <span className="player-name-text">{label ?? (player.kind === "ai" ? ENGINES[player.engine].name : playerLabel(player))}</span>
          {you && <span className="you-tag">나</span>}
          <StoneSvg color={color} className="side-stone" />
          {offline && <span className="offline-tag">연결 끊김</span>}
        </div>
        <div className="player-sub">
          {sub}
          {player.kind === "ai" && usage.calls > 0 && <span className="cost-chip">{formatUsd(usage.costUsd)}</span>}
        </div>
        <div className="stone-count">돌 {stones}개</div>
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
