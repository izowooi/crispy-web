import { Hono, type Context } from "hono";
import {
  ENGINES,
  LIMITS,
  SELECTABLE_EFFORTS,
  type Color,
  type GameMode,
  type PlayerConfig,
  type QuotaInfo,
} from "../shared/types";
import { engineAvailable } from "./ai/engines";
import { consume, hashIp, usedToday } from "./quota";
import { newGameId } from "./room";
import { activeAiGames, lobby, lookup, stats } from "./store";

export { GameRoom } from "./room";

type App = { Bindings: Env };

const TOKEN_RE = /^[A-Za-z0-9_-]{20,64}$/;
const GAME_ID_RE = /^[A-Za-z0-9]{6,16}$/;
const MAX_CONCURRENT_AI = 2;

const app = new Hono<App>().basePath("/api");

app.onError((err, c) => {
  if (err instanceof SyntaxError) return c.json({ error: "잘못된 요청이에요" }, 400);
  console.error(err);
  return c.json({ error: "서버 오류가 났어요" }, 500);
});

app.use("*", async (c, next) => {
  await next();
  c.header("Cache-Control", "no-store");
});

function token(c: Context<App>): string | undefined {
  const t = c.req.header("X-Player-Token");
  return t && TOKEN_RE.test(t) ? t : undefined;
}

function clientIp(c: Context<App>): string {
  const ip = c.req.header("CF-Connecting-IP") ?? "local";
  // Mobile carriers rotate IPv6 privacy addresses; one subscriber keeps the same /64 prefix.
  return ip.includes(":") ? ip.split(":").slice(0, 4).join(":") : ip;
}

async function limited(c: Context<App>): Promise<boolean> {
  if (!c.env.LIMITER) return false;
  const { success } = await c.env.LIMITER.limit({ key: clientIp(c) });
  return !success;
}

function room(c: Context<App>, id: string) {
  return c.env.ROOM.get(c.env.ROOM.idFromName(id));
}

function cleanName(name: unknown): string {
  const s = typeof name === "string" ? name.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 16) : "";
  return s || "익명";
}

function validAi(p: PlayerConfig | undefined): p is Extract<PlayerConfig, { kind: "ai" }> {
  if (!p || p.kind !== "ai" || !(p.engine in ENGINES)) return false;
  const efforts = ENGINES[p.engine].efforts;
  return efforts ? p.effort !== undefined && SELECTABLE_EFFORTS.includes(p.effort) : p.effort === undefined;
}

function clamp(n: unknown, lo: number, hi: number, fallback: number) {
  const v = typeof n === "number" && Number.isFinite(n) ? n : fallback;
  return Math.min(hi, Math.max(lo, Math.round(v)));
}

async function quotaInfo(c: Context<App>): Promise<QuotaInfo> {
  const limit = Number(c.env.AI_DAILY_LIMIT);
  const used = await usedToday(c.env.DB, await hashIp(clientIp(c)));
  return { used, limit, remaining: Math.max(0, limit - used), concurrent: MAX_CONCURRENT_AI };
}

app.get("/engines", (c) => c.json(Object.values(ENGINES).map((e) => ({ ...e, available: engineAvailable(c.env, e.id) }))));

app.get("/quota", async (c) => c.json(await quotaInfo(c)));

app.post("/games", async (c) => {
  if (await limited(c)) return c.json({ error: "요청이 너무 많아요. 잠시 후 다시 시도해 주세요" }, 429);
  const me = token(c);
  if (!me) return c.json({ error: "플레이어 토큰이 없어요" }, 400);
  const body = await c.req.json<{
    mode: GameMode;
    opponent?: PlayerConfig;
    white?: PlayerConfig;
    black?: PlayerConfig;
    color?: Color | "random";
    initialMs?: number;
    incrementMs?: number;
    listed?: boolean;
    name?: string;
  }>();
  const mode = body.mode;
  if (mode !== "pvp" && mode !== "ai" && mode !== "arena") return c.json({ error: "알 수 없는 대국 종류예요" }, 400);

  const lim = mode === "pvp" ? LIMITS.pvp : LIMITS.ai;
  const initialMs = clamp(body.initialMs, 60_000, lim.maxMinutes * 60_000, 10 * 60_000);
  const incrementMs = clamp(body.incrementMs, 0, lim.maxIncrementSec * 1000, 0);
  const color: Color = body.color === "w" || body.color === "b" ? body.color : Math.random() < 0.5 ? "w" : "b";
  const human: PlayerConfig = { kind: "human", name: cleanName(body.name) };

  let white: PlayerConfig;
  let black: PlayerConfig;
  let creatorColor: Color | undefined;
  if (mode === "pvp") {
    const open: PlayerConfig = { kind: "human" };
    [white, black] = color === "w" ? [human, open] : [open, human];
    creatorColor = color;
  } else if (mode === "ai") {
    if (!validAi(body.opponent)) return c.json({ error: "AI 설정이 올바르지 않아요" }, 400);
    [white, black] = color === "w" ? [human, body.opponent] : [body.opponent, human];
    creatorColor = color;
  } else {
    if (!validAi(body.white) || !validAi(body.black)) return c.json({ error: "AI 설정이 올바르지 않아요" }, 400);
    [white, black] = [body.white, body.black];
  }

  const ip = await hashIp(clientIp(c));
  if (mode !== "pvp") {
    for (const p of [white, black]) {
      if (p.kind === "ai" && !engineAvailable(c.env, p.engine)) return c.json({ error: `${ENGINES[p.engine].name}은(는) 지금 쓸 수 없어요` }, 400);
    }
    if ((await activeAiGames(c.env.DB, ip)) >= MAX_CONCURRENT_AI) {
      return c.json({ error: `AI 대국은 동시에 ${MAX_CONCURRENT_AI}판까지 할 수 있어요. 진행 중인 대국을 먼저 끝내 주세요` }, 429);
    }
    const q = await consume(c.env.DB, ip, Number(c.env.AI_DAILY_LIMIT), Number(c.env.AI_GLOBAL_DAILY_LIMIT));
    if (q === "ip") return c.json({ error: `오늘의 AI 대국 ${c.env.AI_DAILY_LIMIT}판을 모두 썼어요. 내일 다시 만나요! 사람과의 대국은 계속 할 수 있어요` }, 429);
    if (q === "global") return c.json({ error: "오늘 전체 AI 대국 한도가 찼어요. 내일 다시 시도해 주세요" }, 429);
  }

  const id = newGameId();
  const snap = await room(c, id).init({
    id,
    mode,
    listed: mode === "pvp" ? body.listed !== false : false,
    white,
    black,
    initialMs,
    incrementMs,
    creator: me,
    creatorIp: ip,
    creatorColor,
  });
  return c.json(snap);
});

app.get("/games/:id", async (c) => {
  const id = c.req.param("id");
  if (!GAME_ID_RE.test(id)) return c.json({ error: "대국을 찾을 수 없어요" }, 404);
  const snap = await room(c, id).view(token(c));
  return snap ? c.json(snap) : c.json({ error: "대국을 찾을 수 없어요" }, 404);
});

app.post("/games/:id/join", async (c) => {
  if (await limited(c)) return c.json({ error: "요청이 너무 많아요" }, 429);
  const id = c.req.param("id");
  const me = token(c);
  if (!GAME_ID_RE.test(id) || !me) return c.json({ error: "잘못된 요청이에요" }, 400);
  const { name } = await c.req.json<{ name?: string }>();
  const res = await room(c, id).join(me, cleanName(name));
  return res.ok ? c.json(res.snap) : c.json({ error: res.error }, 409);
});

app.get("/games/:id/ws", async (c) => {
  const id = c.req.param("id");
  if (!GAME_ID_RE.test(id)) return c.text("not found", 404);
  if (c.req.header("Upgrade") !== "websocket") return c.text("expected websocket", 426);
  return room(c, id).fetch(c.req.raw);
});

app.get("/lobby", async (c) => c.json(await lobby(c.env.DB)));

app.post("/games/lookup", async (c) => {
  const { ids } = await c.req.json<{ ids?: unknown }>();
  const clean = Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string" && GAME_ID_RE.test(x)).slice(0, 50) : [];
  return c.json(await lookup(c.env.DB, clean));
});

app.get("/stats", async (c) => c.json(await stats(c.env.DB)));

app.all("*", (c) => c.json({ error: "not found" }, 404));

export default app;
