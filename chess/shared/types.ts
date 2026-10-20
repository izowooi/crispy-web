export type Color = "w" | "b";

export type EngineId = "jev" | "luna" | "haiku";
/** Only Haiku has an effort knob; Jev and OpenAI Decisions have no reasoning parameter. */
export type Effort = "medium" | "high";
export const SELECTABLE_EFFORTS: Effort[] = ["medium", "high"];

export type PlayerConfig =
  | { kind: "human"; name?: string }
  | { kind: "ai"; engine: EngineId; effort?: Effort };

export interface EngineInfo {
  id: EngineId;
  name: string;
  vendor: string;
  model: string;
  color: string;
  description: string;
  efforts?: Effort[];
  pricing: string;
}

export const ENGINES: Record<EngineId, EngineInfo> = {
  jev: {
    id: "jev",
    name: "Jev",
    vendor: "TypeSafe · OpenRouter",
    model: "~typesafe/jev-latest",
    color: "#8b5cf6",
    description: "의사결정 모델. 합법 수 목록 중 하나를 확률로 고릅니다. 추론 강도 파라미터가 없습니다.",
    pricing: "입력 $0.042/M · 출력 무료 (OpenRouter usage.cost 기준)",
  },
  luna: {
    id: "luna",
    name: "Decisions",
    vendor: "OpenAI",
    model: "gpt-6-luna",
    color: "#10a37f",
    description: "의사결정 API. 합법 수 목록 중 하나를 확률로 고릅니다. 추론 강도 파라미터가 없습니다.",
    pricing: "입력 $0.10/M · 출력 무료",
  },
  haiku: {
    id: "haiku",
    name: "Haiku 5.5",
    vendor: "Anthropic",
    model: "claude-haiku-5-5",
    color: "#e8743b",
    description: "LLM. 생각한 뒤 합법 수 중 하나를 고르고 한 줄 코멘트를 남깁니다.",
    efforts: SELECTABLE_EFFORTS,
    pricing: "입력 $0.10/M · 출력 $0.50/M",
  },
};

export const EFFORT_TEXT: Record<Effort, { label: string; description: string }> = {
  medium: { label: "Medium", description: "effort=medium — 기본값. 속도와 품질의 균형." },
  high: { label: "High", description: "effort=high — 더 깊이 생각합니다. 수당 시간이 더 걸립니다." },
};

export interface Usage {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  thinkMs: number;
  errors: number;
  fallbacks: number;
}

export const emptyUsage = (): Usage => ({
  calls: 0,
  inputTokens: 0,
  outputTokens: 0,
  costUsd: 0,
  thinkMs: 0,
  errors: 0,
  fallbacks: 0,
});

export interface MoveRecord {
  san: string;
  from: string;
  to: string;
  color: Color;
  fen: string;
  thinkMs: number;
  confidence?: number;
  comment?: string;
  fallback?: boolean;
}

/** pvp: two anonymous humans online · ai: human vs AI · arena: AI vs AI. */
export type GameMode = "pvp" | "ai" | "arena";

export type GameStatus = "waiting" | "playing" | "ended";

export type EndReason =
  | "checkmate"
  | "stalemate"
  | "threefold"
  | "fifty-move"
  | "insufficient"
  | "timeout"
  | "timeout-vs-insufficient"
  | "resign"
  | "agreement"
  | "aborted"
  | "expired";

export interface GameSnapshot {
  id: string;
  mode: GameMode;
  /** Listed in the public lobby while waiting for an opponent. */
  listed: boolean;
  createdAt: number;
  white: PlayerConfig;
  black: PlayerConfig;
  initialMs: number;
  incrementMs: number;
  fen: string;
  moves: MoveRecord[];
  status: GameStatus;
  result?: "1-0" | "0-1" | "1/2-1/2" | "*";
  reason?: EndReason;
  clock: { w: number; b: number; running: Color | null; serverNow: number };
  thinking: Color | null;
  usage: { w: Usage; b: Usage };
  lastError?: { color: Color; message: string; at: number };
  /** pvp only: which seats currently have a live connection. */
  online?: { w: boolean; b: boolean };
  drawOffer?: Color | null;
  rematch?: { offeredBy: Color | null; nextId?: string };
  /** pvp: the seat still waiting for an opponent. */
  openSeat?: Color | null;
  /** Seat of the requesting client, filled per viewer (never stored). */
  you?: Color | null;
}

export interface GameSummary {
  id: string;
  mode: GameMode;
  createdAt: number;
  white: PlayerConfig;
  black: PlayerConfig;
  initialMs: number;
  incrementMs: number;
  status: GameStatus;
  result?: string;
  reason?: EndReason;
  moveCount: number;
  costUsd: number;
}

export interface StatRow {
  key: string;
  player: PlayerConfig;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  costUsd: number;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  thinkMs: number;
  moves: number;
  fallbacks: number;
}

export const EMOTES = [
  { id: "hi", emoji: "👋", text: "안녕하세요!" },
  { id: "nice", emoji: "👍", text: "좋은 수네요!" },
  { id: "wow", emoji: "😮", text: "와, 대단해요!" },
  { id: "hmm", emoji: "🤔", text: "음… 고민되네요" },
  { id: "oops", emoji: "😅", text: "앗, 실수!" },
  { id: "gg", emoji: "🤝", text: "좋은 게임이었어요" },
] as const;
export type EmoteId = (typeof EMOTES)[number]["id"];

/** Client → room messages over the game WebSocket. */
export type ClientMessage =
  | { t: "hello"; token: string }
  | { t: "move"; from: string; to: string; promotion?: string }
  | { t: "resign" }
  | { t: "abort" }
  | { t: "draw"; action: "offer" | "accept" | "decline" }
  | { t: "rematch"; action: "offer" | "accept" | "decline" }
  | { t: "emote"; id: EmoteId };

/** Room → client messages. */
export type ServerMessage =
  | { t: "snap"; snap: GameSnapshot }
  | { t: "emote"; color: Color; id: EmoteId }
  | { t: "error"; message: string };

export interface QuotaInfo {
  used: number;
  limit: number;
  remaining: number;
  /** Max simultaneous AI games per visitor. */
  concurrent: number;
}

/** Time-control limits; AI games are capped lower because every move costs API money. */
export const LIMITS = {
  pvp: { maxMinutes: 60, maxIncrementSec: 30 },
  ai: { maxMinutes: 30, maxIncrementSec: 10 },
} as const;

export function playerKey(p: PlayerConfig): string {
  if (p.kind === "human") return "human";
  return p.effort ? `${p.engine}:${p.effort}` : p.engine;
}

/** Variant suffix such as "High", empty for engines without variants. */
export function variantLabel(p: PlayerConfig): string {
  if (p.kind === "human") return "";
  return p.effort ? EFFORT_TEXT[p.effort].label : "";
}

export function playerLabel(p: PlayerConfig): string {
  if (p.kind === "human") return p.name ?? "익명";
  const v = variantLabel(p);
  return v ? `${ENGINES[p.engine].name} ${v}` : ENGINES[p.engine].name;
}

