import assert from "node:assert/strict";
import { test } from "node:test";
import { gridFrom, nearbyLegalPoints, turnOf } from "../shared/omok";
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
        doubleThree: "black",
        black: { kind: "human", name: "A" },
        white: { kind: "human" },
        initialMs: 60_000,
        incrementMs: 2_000,
        creator: A,
        creatorIp: "ip",
        creatorColor: "b",
        ...over,
      },
      now,
    ),
  );
}

const firstLegal: Engine = async (req) => ({
  point: nearbyLegalPoints(gridFrom(req.points), turnOf(req.points.length), req.doubleThree)[0],
  inputTokens: 100,
  outputTokens: 10,
  costUsd: 0.001,
  confidence: 0.5,
});
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
  assert.equal(g.snap.openSeat, "w");
  assert.equal(g.snap.clock.running, null);
  assert.equal(g.humanMove(A, "H8", 1500).ok, false, "no moves before the opponent joins");

  const joined = g.join(B, "B", 5000);
  assert.deepEqual(joined, { ok: true, color: "w" });
  assert.equal(g.snap.status, "playing");
  assert.equal(g.snap.clock.running, "b", "black moves first");
  assert.deepEqual(g.snap.white, { kind: "human", name: "B" });
  assert.equal(g.join(C, "C", 5000).ok, false, "a third visitor cannot take a seat");
  assert.deepEqual(g.join(B, "B", 6000), { ok: true, color: "w" }, "re-joining returns the same seat");
});

test("moves are authorized by seat token and charged to the mover's clock", () => {
  const g = make({}, 0);
  g.join(B, "B", 0);
  assert.equal(g.humanMove(B, "H8", 100).ok, false, "white cannot move on black's turn");
  assert.equal(g.humanMove(C, "H8", 100).ok, false, "spectators cannot move");
  assert.equal(g.humanMove(A, "P8", 100).ok, false, "off the board");
  assert.equal(g.humanMove(A, "H8", 3000).ok, true);
  assert.equal(g.snap.clock.b, 60_000 - 3000 + 2000);
  assert.equal(g.snap.clock.running, "w");
  assert.deepEqual(g.humanMove(B, "H8", 3100), { ok: false, error: "이미 돌이 있는 자리예요" });
  assert.equal(g.resign(C, 4000).ok, false, "only a seated player can resign");
  assert.equal(g.resign(B, 4000).ok, true);
  assert.equal(g.snap.result, "b");
});

test("five in a row wins and a double-three is rejected", () => {
  const g = make({}, 0);
  g.join(B, "B", 0);
  const play = (a: string, b?: string) => {
    assert.equal(g.humanMove(A, a, 0).ok, true, a);
    if (b) assert.equal(g.humanMove(B, b, 0).ok, true, b);
  };
  play("F8", "A1");
  play("G8", "A3");
  play("H6", "A5");
  play("H7", "A7");
  assert.deepEqual(g.humanMove(A, "H8", 0), { ok: false, error: "쌍삼(3-3)은 둘 수 없어요" });
  play("E8", "A9");
  play("D8", "A11");
  play("C8");
  assert.equal(g.snap.status, "ended");
  assert.equal(g.snap.result, "b");
  assert.equal(g.snap.reason, "five");
  assert.deepEqual(g.snap.winLine, ["C8", "D8", "E8", "F8", "G8"]);
});

test("the side to move loses on time", () => {
  const g = make({}, 0);
  g.join(B, "B", 0);
  assert.equal(g.deadline(0), 60_000);
  assert.equal(g.flag(59_999), false);
  assert.equal(g.flag(60_000), true);
  assert.equal(g.snap.reason, "aborted", "nobody moved yet: cancelled, not scored");

  const t = make({}, 0);
  t.join(B, "B", 0);
  t.humanMove(A, "H8", 1000);
  t.humanMove(B, "H9", 2000);
  assert.equal(t.flag(2000 + 60_999), false, "black has 60s - 1s + 2s increment");
  assert.equal(t.flag(2000 + 61_000), true);
  assert.equal(t.snap.reason, "timeout");
  assert.equal(t.snap.result, "w");
});

test("draw offers, abort window and waiting-room expiry", () => {
  const g = make({}, 0);
  assert.equal(g.abort(B, 10).ok, false, "a stranger cannot cancel a waiting room");
  g.join(B, "B", 0);
  assert.equal(g.draw(A, "offer", 10).ok, true);
  assert.equal(g.snap.drawOffer, "b");
  assert.equal(g.draw(A, "accept", 10).ok, false, "cannot accept your own offer");
  g.humanMove(A, "H8", 20);
  assert.equal(g.snap.drawOffer, null, "a move withdraws the offer");
  g.humanMove(B, "H9", 30);
  assert.equal(g.abort(A, 40).ok, false, "no abort once both sides have moved");
  g.draw(B, "offer", 50);
  assert.equal(g.draw(A, "accept", 60).ok, true);
  assert.equal(g.snap.result, "draw");
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
  assert.equal(g.snap.rematch?.offeredBy, "b");
  assert.deepEqual(g.rematch(B, "accept"), { ok: true, start: true });

  // GameRoom.startRematch: the previous white player takes black and moves first.
  const next = make({ creator: B, creatorColor: "b", opponent: A, listed: false }, 100);
  assert.equal(next.snap.status, "playing", "a rematch room starts immediately");
  assert.equal(next.snap.clock.running, "b");
  assert.equal(next.seatOf(B), "b");
  assert.equal(next.seatOf(A), "w");
});

test("AI vs AI plays itself out and tracks usage per side", async () => {
  const g = make({ mode: "arena", white: { kind: "ai", engine: "jev" }, black: { kind: "ai", engine: "luna" }, creatorColor: undefined }, Date.now());
  assert.equal(g.snap.status, "playing");
  for (let i = 0; i < 20 && g.aiToMove(); i++) await playAiTurn(g, firstLegal, new AbortController(), Date.now, () => {});
  assert.equal(g.snap.moves.length, 20);
  assert.equal(g.snap.usage.b.calls, 10);
  assert.equal(g.snap.usage.b.inputTokens, 1000);
  assert.ok(Math.abs(g.snap.usage.w.costUsd - 0.01) < 1e-9);
  assert.equal(g.abort(B, Date.now()).ok, false, "only the creator can stop an AI vs AI game");
  assert.equal(g.abort(A, Date.now()).ok, true);
});

test("an AI that thinks past its clock loses on time, not by API error", async () => {
  const g = make({ mode: "ai", black: { kind: "ai", engine: "haiku", effort: "high" }, white: { kind: "human", name: "A" }, creatorColor: "w", initialMs: 150 }, Date.now());
  g.aiMove("H8", Date.now(), {});
  g.humanMove(A, "H9", Date.now());
  await playAiTurn(g, slow, new AbortController(), Date.now, () => {});
  assert.equal(g.snap.reason, "timeout");
  assert.equal(g.snap.result, "w");
  assert.equal(g.snap.usage.b.errors, 0);
});

test("repeated API failures fall back to a random legal point near the stones", async () => {
  const g = make({ mode: "ai", black: { kind: "ai", engine: "jev" }, white: { kind: "human", name: "A" }, creatorColor: "w" }, Date.now());
  await playAiTurn(g, broken, new AbortController(), Date.now, () => {});
  assert.equal(g.snap.moves[0].fallback, true);
  assert.ok(nearbyLegalPoints(gridFrom([]), "b").includes(g.snap.moves[0].at));
  assert.equal(g.snap.usage.b.errors, 3);
  assert.equal(g.snap.usage.b.fallbacks, 1);
});

test("a resign during an AI call discards the late answer", async () => {
  const g = make({ mode: "ai", black: { kind: "ai", engine: "jev" }, white: { kind: "human", name: "A" }, creatorColor: "w" }, Date.now());
  const ctrl = new AbortController();
  const turn = playAiTurn(g, slow, ctrl, Date.now, () => {});
  g.resign(A, Date.now());
  ctrl.abort();
  await turn;
  assert.equal(g.snap.moves.length, 0);
  assert.equal(g.snap.result, "b");
});

test("engines get the same plain position with no evaluation hints", () => {
  const points = ["H8", "A1", "I8", "A2", "J8", "A3", "K8", "B9"];
  const notes = Object.fromEntries(candidates(gridFrom(points), "b", "black").map((c) => [c.point, c.note]));
  assert.equal(notes["L8"], "place black stone on L8", "even the winning point gets only a descriptive note");
  const brief = positionBrief(points);
  assert.match(brief, /You are playing Black \(X\)/);
  assert.match(brief, / 8 {2}\. \. \. \. \. \. \. X X X X/);
  assert.doesNotMatch(brief, /threat|win|four|three|block/i);
});

test("stats rank AI players and skip humans", () => {
  const u = { calls: 1, inputTokens: 10, outputTokens: 1, costUsd: 0.001, thinkMs: 100, errors: 0, fallbacks: 0 };
  const { rows, matchups } = aggregateStats([
    { white: { kind: "ai", engine: "jev" }, black: { kind: "ai", engine: "haiku", effort: "medium" }, result: "w", usage: { w: u, b: u }, moves: { w: 5, b: 5 } },
    { white: { kind: "human", name: "x" }, black: { kind: "ai", engine: "jev" }, result: "b", usage: { w: u, b: u }, moves: { w: 3, b: 4 } },
  ]);
  assert.deepEqual(rows.map((r) => r.key), ["jev", "haiku:medium"]);
  assert.equal(rows[0].wins, 2);
  assert.deepEqual(matchups, [{ a: "haiku:medium", b: "jev", aWins: 0, bWins: 1, draws: 0 }]);
});

test("quota day rolls over at midnight KST", () => {
  assert.equal(kstDay(Date.UTC(2026, 9, 20, 14, 59)), "2026-10-20");
  assert.equal(kstDay(Date.UTC(2026, 9, 20, 15, 0)), "2026-10-21");
});

test("the room's double-three rule decides who is restricted", () => {
  const setup = (rule: "black" | "both" | "none") => {
    const g = make({ doubleThree: rule, creatorColor: "w", white: { kind: "human", name: "A" }, black: { kind: "human" } }, 0);
    g.join(B, "B", 0); // B is black, A is white
    for (const [b, w] of [["A1", "F8"], ["A3", "G8"], ["A5", "H6"], ["A7", "H7"], ["A9"]]) {
      assert.equal(g.humanMove(B, b, 0).ok, true, b);
      if (w) assert.equal(g.humanMove(A, w, 0).ok, true, w);
    }
    return g.humanMove(A, "H8", 0);
  };
  assert.equal(setup("black").ok, true, "default: white may play a double-three");
  assert.deepEqual(setup("both"), { ok: false, error: "쌍삼(3-3)은 둘 수 없어요" });
  assert.equal(setup("none").ok, true);
});
