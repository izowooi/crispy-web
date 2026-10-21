import { DurableObject } from "cloudflare:workers";
import { EMOTES, type ClientMessage, type Color, type GameSnapshot, type ServerMessage } from "../shared/types";
import { createEngine } from "./ai/engines";
import { playAiTurn } from "./ai/turn";
import { createState, Game, type CreateInput } from "./game";
import { saveGame } from "./store";

interface Attachment {
  color: Color | null;
  token?: string;
}

const EMOTE_COOLDOWN_MS = 2500;
const EMOTE_IDS = new Set<string>(EMOTES.map((e) => e.id));

/**
 * One game = one Durable Object. It owns the board and clocks, pushes snapshots over
 * hibernatable WebSockets, and uses its single alarm for both flag fall and AI turns.
 */
export class GameRoom extends DurableObject<Env> {
  private game: Game | null = null;
  private aiCtrl?: AbortController;
  private aiBusy = false;
  private savedStatus?: string;
  private lastEmote: Record<Color, number> = { w: 0, b: 0 };

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      const st = await ctx.storage.get<Game["st"]>("state");
      if (st) {
        this.game = new Game(st);
        this.savedStatus = st.snap.status;
      }
    });
  }

  async init(input: CreateInput): Promise<GameSnapshot> {
    if (this.game) throw new Error("game already exists");
    this.game = new Game(createState(input, Date.now()));
    await this.persist();
    return this.viewFor(input.creatorColor ?? null);
  }

  async view(token?: string): Promise<GameSnapshot | null> {
    return this.game ? this.viewFor(this.game.seatOf(token)) : null;
  }

  async join(token: string, name: string): Promise<{ ok: true; snap: GameSnapshot } | { ok: false; error: string }> {
    const g = this.game;
    if (!g) return { ok: false, error: "대국을 찾을 수 없어요" };
    if (g.st.creator === token && g.snap.status === "waiting") return { ok: false, error: "내가 만든 방이에요. 상대를 기다려 주세요" };
    const res = g.join(token, name, Date.now());
    if (!res.ok) return res;
    await this.persist();
    this.broadcast();
    return { ok: true, snap: this.viewFor(res.color) };
  }

  async fetch(req: Request): Promise<Response> {
    if (req.headers.get("Upgrade") !== "websocket") return new Response("expected websocket", { status: 426 });
    if (!this.game) return new Response("not found", { status: 404 });
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ color: null } satisfies Attachment);
    this.send(server, { t: "snap", snap: this.viewFor(null) });
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    const g = this.game;
    if (!g || typeof raw !== "string" || raw.length > 2000) return;
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    const att = ws.deserializeAttachment() as Attachment;
    const now = Date.now();

    if (msg.t === "hello") {
      const color = g.seatOf(String(msg.token));
      ws.serializeAttachment({ color, token: String(msg.token) } satisfies Attachment);
      this.send(ws, { t: "snap", snap: this.viewFor(color) });
      if (color && g.snap.mode === "pvp") this.broadcast();
      return;
    }

    const token = att.token;
    if (msg.t === "emote") {
      const color = att.color;
      if (!color || g.snap.mode !== "pvp" || !EMOTE_IDS.has(msg.id)) return;
      if (now - this.lastEmote[color] < EMOTE_COOLDOWN_MS) return;
      this.lastEmote[color] = now;
      this.broadcastRaw({ t: "emote", color, id: msg.id });
      return;
    }

    let res: { ok: boolean; error?: string } = { ok: false, error: "알 수 없는 요청" };
    if (msg.t === "move") res = g.humanMove(token, String(msg.at), now);
    else if (msg.t === "resign") res = g.resign(token, now);
    else if (msg.t === "abort") res = g.abort(token, now);
    else if (msg.t === "draw") res = g.draw(token, msg.action, now);
    else if (msg.t === "rematch") {
      const r = g.rematch(token, msg.action);
      res = r;
      if (r.ok && r.start) await this.startRematch();
    }

    if (!res.ok) {
      this.send(ws, { t: "error", message: res.error ?? "요청을 처리하지 못했어요" });
      this.send(ws, { t: "snap", snap: this.viewFor(att.color) });
      return;
    }
    if (g.snap.status === "ended") this.aiCtrl?.abort();
    await this.persist();
    this.broadcast();
  }

  async webSocketClose(ws: WebSocket) {
    const att = ws.deserializeAttachment() as Attachment | null;
    if (att?.color && this.game?.snap.mode === "pvp") this.broadcast();
  }

  async alarm() {
    const g = this.game;
    if (!g) return;
    const now = Date.now();
    if (g.expire(now) || g.flag(now)) {
      this.aiCtrl?.abort();
      await this.persist();
      this.broadcast();
      return;
    }
    const color = g.aiToMove();
    const p = color ? g.player(color) : null;
    if (p?.kind === "ai" && !this.aiBusy) {
      this.aiBusy = true;
      const ctrl = (this.aiCtrl = new AbortController());
      try {
        const engine = createEngine(this.env, p.engine);
        await playAiTurn(g, engine, ctrl, Date.now, () => this.broadcast());
      } catch (err) {
        console.error("ai turn failed", err);
      } finally {
        this.aiBusy = false;
      }
      await this.persist();
      this.broadcast();
      return;
    }
    await this.schedule();
  }

  private async startRematch() {
    const g = this.game!;
    const nextId = newGameId();
    const stub = this.env.ROOM.get(this.env.ROOM.idFromName(nextId));
    // Colors swap, so the previous white player moves first; both keep their seat tokens.
    await stub.init({
      id: nextId,
      mode: "pvp",
      listed: false,
      doubleThree: g.rule(),
      white: g.snap.black,
      black: g.snap.white,
      initialMs: g.snap.initialMs,
      incrementMs: g.snap.incrementMs,
      creator: g.st.seats.w!,
      creatorIp: g.st.creatorIp,
      creatorColor: "b",
      opponent: g.st.seats.b!,
    });
    g.snap.rematch = { offeredBy: null, nextId };
  }

  private viewFor(color: Color | null): GameSnapshot {
    const snap = this.game!.view(Date.now(), color);
    if (snap.mode === "pvp") snap.online = { w: this.isOnline("w"), b: this.isOnline("b") };
    return snap;
  }

  private isOnline(color: Color): boolean {
    return this.ctx.getWebSockets().some((ws) => ws.readyState === WebSocket.OPEN && (ws.deserializeAttachment() as Attachment)?.color === color);
  }

  private send(ws: WebSocket, msg: ServerMessage) {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // socket already closing
    }
  }

  private broadcastRaw(msg: ServerMessage) {
    const data = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(data);
      } catch {
        // socket already closing
      }
    }
  }

  private broadcast() {
    if (!this.game) return;
    for (const ws of this.ctx.getWebSockets()) {
      const att = ws.deserializeAttachment() as Attachment | null;
      this.send(ws, { t: "snap", snap: this.viewFor(att?.color ?? null) });
    }
  }

  private async persist() {
    const g = this.game!;
    await this.ctx.storage.put("state", g.st);
    const s = g.snap;
    // D1 is only the lobby/archive index: write on status changes and every 10 plies.
    if (s.status !== this.savedStatus || s.moves.length % 10 === 0) {
      try {
        await saveGame(this.env.DB, g.st);
        this.savedStatus = s.status;
      } catch (err) {
        console.error("d1 save failed", err);
      }
    }
    await this.schedule();
  }

  private async schedule() {
    const g = this.game!;
    const now = Date.now();
    if (g.aiToMove() && !this.aiBusy) {
      await this.ctx.storage.setAlarm(now);
      return;
    }
    const deadline = g.deadline(now);
    if (deadline === null) await this.ctx.storage.deleteAlarm();
    else await this.ctx.storage.setAlarm(deadline + 20);
  }
}

const ID_CHARS = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function newGameId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return [...bytes].map((b) => ID_CHARS[b % ID_CHARS.length]).join("");
}
