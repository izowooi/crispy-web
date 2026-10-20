import { Chess } from "chess.js";
import {
  emptyUsage,
  type Color,
  type EndReason,
  type GameMode,
  type GameSnapshot,
  type MoveRecord,
  type PlayerConfig,
} from "../shared/types";

/** Everything a room persists. Seat tokens never leave the server. */
export interface GameState {
  snap: GameSnapshot;
  turnStartedAt: number;
  seats: { w?: string; b?: string };
  /** Token of whoever opened the room; may abort an AI vs AI game. */
  creator: string;
  creatorIp: string;
  expiresAt?: number;
}

export interface CreateInput {
  id: string;
  mode: GameMode;
  white: PlayerConfig;
  black: PlayerConfig;
  initialMs: number;
  incrementMs: number;
  listed: boolean;
  creator: string;
  creatorIp: string;
  /** Seat the creator takes (pvp/ai). */
  creatorColor?: Color;
  /** Rematch: the other human already holds this seat. */
  opponent?: string;
}

export interface MoveMeta {
  confidence?: number;
  comment?: string;
  fallback?: boolean;
}

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/** A waiting room nobody joins is closed after this long. */
export const WAITING_TTL_MS = 30 * 60_000;

const other = (c: Color): Color => (c === "w" ? "b" : "w");

export function createState(input: CreateInput, now: number): GameState {
  const seats: GameState["seats"] = {};
  if (input.creatorColor) seats[input.creatorColor] = input.creator;
  if (input.opponent && input.creatorColor) seats[other(input.creatorColor)] = input.opponent;
  const waiting = input.mode === "pvp" && !(seats.w && seats.b);
  return {
    seats,
    creator: input.creator,
    creatorIp: input.creatorIp,
    turnStartedAt: now,
    expiresAt: waiting ? now + WAITING_TTL_MS : undefined,
    snap: {
      id: input.id,
      mode: input.mode,
      listed: input.listed,
      createdAt: now,
      white: input.white,
      black: input.black,
      initialMs: input.initialMs,
      incrementMs: input.incrementMs,
      fen: new Chess().fen(),
      moves: [],
      status: waiting ? "waiting" : "playing",
      clock: { w: input.initialMs, b: input.initialMs, running: waiting ? null : "w", serverNow: now },
      thinking: null,
      usage: { w: emptyUsage(), b: emptyUsage() },
      openSeat: waiting ? other(input.creatorColor ?? "w") : null,
      drawOffer: null,
      rematch: { offeredBy: null },
    },
  };
}

/**
 * Rules, clocks and seat checks for one game, independent of where it runs.
 * The Durable Object wraps this with storage, sockets and alarms.
 */
export class Game {
  readonly chess = new Chess();

  constructor(readonly st: GameState) {
    for (const m of st.snap.moves) this.chess.move(m.san);
  }

  get snap() {
    return this.st.snap;
  }

  view(now: number, you: Color | null = null): GameSnapshot {
    return { ...this.snap, clock: { ...this.snap.clock, serverNow: now }, you };
  }

  seatOf(token: string | undefined): Color | null {
    if (!token) return null;
    if (this.st.seats.w === token) return "w";
    if (this.st.seats.b === token) return "b";
    return null;
  }

  player(color: Color): PlayerConfig {
    return color === "w" ? this.snap.white : this.snap.black;
  }

  turn(): Color {
    return this.chess.turn();
  }

  /** Side to move when it is an AI that should be thinking now. */
  aiToMove(): Color | null {
    if (this.snap.status !== "playing") return null;
    return this.player(this.turn()).kind === "ai" ? this.turn() : null;
  }

  remaining(color: Color, now: number): number {
    const base = this.snap.clock[color];
    return this.snap.clock.running === color ? base - (now - this.st.turnStartedAt) : base;
  }

  /** When the room next needs to wake up on its own (flag fall or room expiry). */
  deadline(now: number): number | null {
    if (this.snap.status === "waiting") return this.st.expiresAt ?? null;
    const running = this.snap.clock.running;
    if (this.snap.status !== "playing" || !running) return null;
    return now + Math.max(0, this.remaining(running, now));
  }

  join(token: string, name: string, now: number): Result<{ color: Color }> {
    const mine = this.seatOf(token);
    if (mine) return { ok: true, color: mine };
    const seat = this.snap.openSeat;
    if (this.snap.status !== "waiting" || !seat) return { ok: false, error: "이미 시작된 대국이에요" };
    this.st.seats[seat] = token;
    const me: PlayerConfig = { kind: "human", name };
    if (seat === "w") this.snap.white = me;
    else this.snap.black = me;
    this.snap.openSeat = null;
    this.snap.status = "playing";
    this.snap.clock.running = "w";
    this.st.turnStartedAt = now;
    this.st.expiresAt = undefined;
    return { ok: true, color: seat };
  }

  humanMove(token: string | undefined, input: { from: string; to: string; promotion?: string }, now: number): Result {
    if (this.snap.status !== "playing") return { ok: false, error: "대국 중이 아니에요" };
    const color = this.turn();
    if (this.player(color).kind !== "human" || this.seatOf(token) !== color) return { ok: false, error: "내 차례가 아니에요" };
    if (this.flag(now)) return { ok: false, error: "시간이 다 됐어요" };
    let san: string;
    try {
      san = this.chess.move({ from: input.from, to: input.to, promotion: input.promotion ?? "q" }).san;
    } catch {
      return { ok: false, error: "둘 수 없는 수예요" };
    }
    this.chess.undo();
    this.commit(san, now, {});
    return { ok: true };
  }

  /** Plays a move chosen by an AI (or the random fallback) for the side to move. */
  aiMove(san: string, now: number, meta: MoveMeta) {
    this.commit(san, now, meta);
  }

  resign(token: string | undefined, now: number): Result {
    const color = this.seatOf(token);
    if (this.snap.status !== "playing" || !color) return { ok: false, error: "기권할 수 없어요" };
    this.end(color === "w" ? "0-1" : "1-0", "resign", now);
    return { ok: true };
  }

  /** Cancel without a result: the creator of an empty or AI-only room, or a player before both have moved. */
  abort(token: string | undefined, now: number): Result {
    const s = this.snap.status;
    if (s === "ended") return { ok: false, error: "이미 끝난 대국이에요" };
    const isCreator = token !== undefined && token === this.st.creator;
    const allowed =
      (s === "waiting" && isCreator) ||
      (this.snap.mode === "arena" && isCreator) ||
      (this.seatOf(token) !== null && this.snap.moves.length < 2);
    if (!allowed) return { ok: false, error: "지금은 취소할 수 없어요" };
    this.end("*", "aborted", now);
    return { ok: true };
  }

  draw(token: string | undefined, action: "offer" | "accept" | "decline", now: number): Result {
    const color = this.seatOf(token);
    if (this.snap.mode !== "pvp" || this.snap.status !== "playing" || !color) return { ok: false, error: "무승부를 제안할 수 없어요" };
    const offer = this.snap.drawOffer ?? null;
    if (action === "offer") {
      if (offer === other(color)) return this.draw(token, "accept", now);
      this.snap.drawOffer = color;
    } else if (action === "accept") {
      if (offer !== other(color)) return { ok: false, error: "받은 무승부 제안이 없어요" };
      this.end("1/2-1/2", "agreement", now);
    } else if (offer === other(color)) {
      this.snap.drawOffer = null;
    }
    return { ok: true };
  }

  /** Returns `start: true` when both players agreed and the caller should open the next game. */
  rematch(token: string | undefined, action: "offer" | "accept" | "decline"): Result<{ start: boolean }> {
    const color = this.seatOf(token);
    if (this.snap.mode !== "pvp" || this.snap.status !== "ended" || !color) return { ok: false, error: "재대결을 할 수 없어요" };
    const r = (this.snap.rematch ??= { offeredBy: null });
    if (r.nextId) return { ok: true, start: false };
    if (action === "decline") {
      r.offeredBy = null;
      return { ok: true, start: false };
    }
    if (r.offeredBy === other(color)) return { ok: true, start: true };
    if (action === "offer") r.offeredBy = color;
    return { ok: true, start: false };
  }

  expire(now: number): boolean {
    if (this.snap.status !== "waiting" || !this.st.expiresAt || now < this.st.expiresAt) return false;
    this.end("*", "expired", now);
    return true;
  }

  /** Ends the game if the side to move has run out of time. */
  flag(now: number): boolean {
    const running = this.snap.clock.running;
    if (!running || this.snap.status !== "playing") return false;
    if (this.remaining(running, now) > 0) return false;
    this.snap.clock[running] = 0;
    this.snap.clock.running = null;
    // Like lichess, a game where a side never made its first move is cancelled rather than scored.
    if (this.snap.moves.length < 2) this.end("*", "aborted", now);
    // Lichess rule: flagging against a side that cannot possibly mate is a draw.
    else if (!canMate(this.chess, other(running))) this.end("1/2-1/2", "timeout-vs-insufficient", now);
    else this.end(running === "w" ? "0-1" : "1-0", "timeout", now);
    return true;
  }

  private commit(san: string, now: number, meta: MoveMeta) {
    const color = this.turn();
    const m = this.chess.move(san);
    const spent = now - this.st.turnStartedAt;
    this.snap.clock[color] = this.snap.clock[color] - spent + this.snap.incrementMs;
    const record: MoveRecord = {
      san: m.san,
      from: m.from,
      to: m.to,
      color,
      fen: this.chess.fen(),
      thinkMs: spent,
      confidence: meta.confidence,
      comment: meta.comment,
      fallback: meta.fallback,
    };
    this.snap.moves.push(record);
    this.snap.fen = this.chess.fen();
    this.snap.thinking = null;
    this.snap.drawOffer = null;
    this.st.turnStartedAt = now;

    const over = this.gameOverReason();
    if (over) {
      this.snap.clock.running = null;
      this.end(over.result, over.reason, now);
      return;
    }
    this.snap.clock.running = other(color);
  }

  private gameOverReason(): { result: "1-0" | "0-1" | "1/2-1/2"; reason: EndReason } | null {
    const c = this.chess;
    if (c.isCheckmate()) return { result: c.turn() === "w" ? "0-1" : "1-0", reason: "checkmate" };
    if (c.isStalemate()) return { result: "1/2-1/2", reason: "stalemate" };
    if (c.isInsufficientMaterial()) return { result: "1/2-1/2", reason: "insufficient" };
    if (c.isThreefoldRepetition()) return { result: "1/2-1/2", reason: "threefold" };
    if (c.isDrawByFiftyMoves()) return { result: "1/2-1/2", reason: "fifty-move" };
    return null;
  }

  private end(result: GameSnapshot["result"], reason: EndReason, now: number) {
    const running = this.snap.clock.running;
    if (running) {
      this.snap.clock[running] = Math.max(0, this.remaining(running, now));
      this.snap.clock.running = null;
    }
    this.snap.status = "ended";
    this.snap.result = result;
    this.snap.reason = reason;
    this.snap.thinking = null;
    this.snap.drawOffer = null;
    this.snap.openSeat = null;
    this.st.expiresAt = undefined;
  }
}

function canMate(chess: Chess, color: Color): boolean {
  const pieces = chess
    .board()
    .flat()
    .filter((sq) => sq && sq.color === color && sq.type !== "k");
  if (pieces.length === 0) return false;
  if (pieces.length === 1 && (pieces[0]!.type === "n" || pieces[0]!.type === "b")) return false;
  return true;
}
