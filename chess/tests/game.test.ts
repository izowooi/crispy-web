import assert from "node:assert/strict";
import { test } from "node:test";
import { Chess } from "chess.js";
import type { Engine } from "../worker/ai/engines";
import { candidates, positionBrief } from "../worker/ai/position";
import { playAiTurn } from "../worker/ai/turn";
import { createState, Game, WAITING_TTL_MS, type CreateInput } from "../worker/game";
import { kstDay } from "../worker/time";
import { aggregateStats } from "../worker/stats";

const A = "token-aaaaaaaaaaaaaaaaaaaa";
const B = "token-bbbbbbbbbbbbbbbbbbbb";
const C = "token-cccccccccccccccccccc";

function make(over: Partial<CreateInput> = {}, now = 0) {
  return new Game(
    createState(
      {
        id: "g1",
        mode: "pvp",
        listed: true,
        white: { kind: "human", name: "A" },
        black: { kind: "human" },
        initialMs: 60_000,
        incrementMs: 2_000,
        creator: A,
        creatorIp: "ip",
        creatorColor: "w",
        ...over,
      },
      now,
    ),
  );
}

const firstLegal: Engine = async (req) => {
  const chess = new Chess();
  chess.loadPgn(req.pgn);
  return { san: chess.moves()[0], inputTokens: 100, outputTokens: 10, costUsd: 0.001, confidence: 0.5 };
};
// AbortSignal.timeout does not keep Node's event loop alive, so hold it open until the abort.
const slow: Engine = (req) =>
  new Promise((_, reject) => {
    const keepAlive = setInterval(() => {}, 20);
    req.signal.addEventListener("abort", () => {
      clearInterval(keepAlive);
      reject(req.signal.reason);
    });
  });
const broken: Engine = async () => {
  throw new Error("boom");
};

test("pvp room waits for an opponent, then the clock starts on join", () => {
  const g = make({}, 1000);
  assert.equal(g.snap.status, "waiting");
  assert.equal(g.snap.openSeat, "b");
  assert.equal(g.snap.clock.running, null);
  assert.equal(g.humanMove(A, { from: "e2", to: "e4" }, 1500).ok, false, "no moves before the opponent joins");

  const joined = g.join(B, "B", 5000);
  assert.deepEqual(joined, { ok: true, color: "b" });
  assert.equal(g.snap.status, "playing");
  assert.equal(g.snap.clock.running, "w");
  assert.deepEqual(g.snap.black, { kind: "human", name: "B" });
  assert.equal(g.join(C, "C", 5000).ok, false, "a third visitor cannot take a seat");
  assert.deepEqual(g.join(B, "B", 6000), { ok: true, color: "b" }, "re-joining returns the same seat");
});

test("moves are authorized by seat token and charged to the mover's clock", () => {
  const g = make({}, 0);
  g.join(B, "B", 0);
  assert.equal(g.humanMove(B, { from: "e7", to: "e5" }, 100).ok, false, "black cannot move on white's turn");
  assert.equal(g.humanMove(C, { from: "e2", to: "e4" }, 100).ok, false, "spectators cannot move");
  assert.equal(g.humanMove(A, { from: "e2", to: "e5" }, 100).ok, false, "illegal move");
  assert.equal(g.humanMove(A, { from: "e2", to: "e4" }, 3000).ok, true);
  assert.equal(g.snap.clock.w, 60_000 - 3000 + 2000);
  assert.equal(g.snap.clock.running, "b");
  assert.equal(g.resign(C, 4000).ok, false, "only a seated player can resign");
  assert.equal(g.resign(B, 4000).ok, true);
  assert.equal(g.snap.result, "1-0");
});

test("the side to move loses on time, or draws if the opponent cannot mate", () => {
  const g = make({}, 0);
  g.join(B, "B", 0);
  assert.equal(g.deadline(0), 60_000);
  assert.equal(g.flag(59_999), false);
  assert.equal(g.flag(60_000), true);
  assert.equal(g.snap.reason, "aborted", "nobody moved yet: cancelled, not scored");

  const t = make({}, 0);
  t.join(B, "B", 0);
  t.humanMove(A, { from: "e2", to: "e4" }, 1000);
  t.humanMove(B, { from: "e7", to: "e5" }, 2000);
  assert.equal(t.flag(2000 + 61_000), true);
  assert.equal(t.snap.reason, "timeout");
  assert.equal(t.snap.result, "0-1");

  const bare = make({}, 0);
  bare.join(B, "B", 0);
  bare.humanMove(A, { from: "e2", to: "e4" }, 0);
  bare.humanMove(B, { from: "e7", to: "e5" }, 0);
  bare.chess.load("4k3/8/8/8/8/8/8/4K3 w - - 0 1");
  assert.equal(bare.flag(62_000), true, "white has 60s + 2s increment");
  assert.equal(bare.snap.reason, "timeout-vs-insufficient");
});

test("draw offers, abort window and waiting-room expiry", () => {
  const g = make({}, 0);
  assert.equal(g.abort(B, 10).ok, false, "a stranger cannot cancel a waiting room");
  g.join(B, "B", 0);
  assert.equal(g.draw(A, "offer", 10).ok, true);
  assert.equal(g.snap.drawOffer, "w");
  assert.equal(g.draw(A, "accept", 10).ok, false, "cannot accept your own offer");
  g.humanMove(A, { from: "e2", to: "e4" }, 20);
  assert.equal(g.snap.drawOffer, null, "a move withdraws the offer");
  g.humanMove(B, { from: "e7", to: "e5" }, 30);
  assert.equal(g.abort(A, 40).ok, false, "no abort once both sides have moved");
  g.draw(B, "offer", 50);
  assert.equal(g.draw(A, "accept", 60).ok, true);
  assert.equal(g.snap.result, "1/2-1/2");
  assert.equal(g.snap.reason, "agreement");

  const w = make({}, 0);
  assert.equal(w.deadline(0), WAITING_TTL_MS);
  assert.equal(w.expire(WAITING_TTL_MS - 1), false);
  assert.equal(w.expire(WAITING_TTL_MS), true);
  assert.equal(w.snap.reason, "expired");
});

test("rematch starts only after both players agree", () => {
  const g = make({}, 0);
  g.join(B, "B", 0);
  g.resign(A, 10);
  assert.deepEqual(g.rematch(C, "offer"), { ok: false, error: "재대결을 할 수 없어요" });
  assert.deepEqual(g.rematch(A, "offer"), { ok: true, start: false });
  assert.equal(g.snap.rematch?.offeredBy, "w");
  assert.deepEqual(g.rematch(B, "accept"), { ok: true, start: true });

  const next = make({ creator: B, creatorColor: "w", opponent: A, listed: false }, 100);
  assert.equal(next.snap.status, "playing", "a rematch room starts immediately");
  assert.equal(next.seatOf(B), "w");
  assert.equal(next.seatOf(A), "b");
});

test("AI vs AI plays itself out and tracks usage per side", async () => {
  const g = make({ mode: "arena", white: { kind: "ai", engine: "jev" }, black: { kind: "ai", engine: "luna" }, creatorColor: undefined }, Date.now());
  assert.equal(g.snap.status, "playing");
  for (let i = 0; i < 20 && g.aiToMove(); i++) await playAiTurn(g, firstLegal, new AbortController(), Date.now, () => {});
  assert.equal(g.snap.moves.length, 20);
  assert.equal(g.snap.usage.w.calls, 10);
  assert.equal(g.snap.usage.w.inputTokens, 1000);
  assert.ok(Math.abs(g.snap.usage.b.costUsd - 0.01) < 1e-9);
  assert.equal(g.abort(B, Date.now()).ok, false, "only the creator can stop an AI vs AI game");
  assert.equal(g.abort(A, Date.now()).ok, true);
});

test("an AI that thinks past its clock loses on time, not by API error", async () => {
  const g = make({ mode: "ai", white: { kind: "ai", engine: "haiku", effort: "high" }, black: { kind: "human", name: "A" }, creatorColor: "b", initialMs: 150 }, Date.now());
  g.aiMove("e4", Date.now(), {});
  g.humanMove(A, { from: "e7", to: "e5" }, Date.now());
  await playAiTurn(g, slow, new AbortController(), Date.now, () => {});
  assert.equal(g.snap.reason, "timeout");
  assert.equal(g.snap.result, "0-1");
  assert.equal(g.snap.usage.w.errors, 0);
});

test("repeated API failures fall back to a random legal move", async () => {
  const g = make({ mode: "ai", white: { kind: "ai", engine: "jev" }, black: { kind: "human", name: "A" }, creatorColor: "b" }, Date.now());
  await playAiTurn(g, broken, new AbortController(), Date.now, () => {});
  assert.equal(g.snap.moves[0].fallback, true);
  assert.equal(g.snap.usage.w.errors, 3);
  assert.equal(g.snap.usage.w.fallbacks, 1);
});

test("a resign during an AI call discards the late answer", async () => {
  const g = make({ mode: "ai", white: { kind: "ai", engine: "jev" }, black: { kind: "human", name: "A" }, creatorColor: "b" }, Date.now());
  const ctrl = new AbortController();
  const turn = playAiTurn(g, slow, ctrl, Date.now, () => {});
  g.resign(A, Date.now());
  ctrl.abort();
  await turn;
  assert.equal(g.snap.moves.length, 0);
  assert.equal(g.snap.result, "1-0");
});

test("engines get the same plain position with no evaluation hints", () => {
  const chess = new Chess("r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4");
  const notes = Object.fromEntries(candidates(chess).map((c) => [c.san, c.note]));
  assert.equal(notes["Qxf7#"], "queen h5->f7");
  assert.doesNotMatch(positionBrief(chess), /Material|check|hang/i);
});

test("stats rank AI players and skip humans", () => {
  const u = { calls: 1, inputTokens: 10, outputTokens: 1, costUsd: 0.001, thinkMs: 100, errors: 0, fallbacks: 0 };
  const { rows, matchups } = aggregateStats([
    { white: { kind: "ai", engine: "jev" }, black: { kind: "ai", engine: "haiku", effort: "medium" }, result: "1-0", usage: { w: u, b: u }, moves: { w: 5, b: 4 } },
    { white: { kind: "human", name: "x" }, black: { kind: "ai", engine: "jev" }, result: "0-1", usage: { w: u, b: u }, moves: { w: 3, b: 3 } },
  ]);
  assert.deepEqual(rows.map((r) => r.key), ["jev", "haiku:medium"]);
  assert.equal(rows[0].wins, 2);
  assert.deepEqual(matchups, [{ a: "haiku:medium", b: "jev", aWins: 0, bWins: 1, draws: 0 }]);
});

test("quota day rolls over at midnight KST", () => {
  assert.equal(kstDay(Date.UTC(2026, 9, 20, 14, 59)), "2026-10-20");
  assert.equal(kstDay(Date.UTC(2026, 9, 20, 15, 0)), "2026-10-21");
});
