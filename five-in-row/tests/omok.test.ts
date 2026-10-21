import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyGrid, forbiddenPoints, gridFrom, judge, nearbyLegalPoints, parsePoint, SIZE, type Grid } from "../shared/omok";

function grid(black: string, white = ""): Grid {
  const g = emptyGrid();
  for (const [list, c] of [[black, "b"], [white, "w"]] as const) {
    for (const p of list.split(" ").filter(Boolean)) {
      const pt = parsePoint(p)!;
      g[pt.y * SIZE + pt.x] = c;
    }
  }
  return g;
}

test("points parse only inside the 15×15 board", () => {
  assert.deepEqual(parsePoint("A1"), { x: 0, y: 0 });
  assert.deepEqual(parsePoint("O15"), { x: 14, y: 14 });
  for (const bad of ["P1", "A0", "A16", "h8", "H08", ""]) assert.equal(parsePoint(bad), null, bad);
  assert.deepEqual(judge(emptyGrid(), "Z9", "b"), { ok: false, reason: "outside" });
});

test("five or more in a row wins in every direction", () => {
  assert.deepEqual(judge(grid("D8 E8 F8 G8"), "H8", "b"), { ok: true, five: ["D8", "E8", "F8", "G8", "H8"] });
  assert.ok(judge(grid("H4 H5 H6 H7"), "H8", "w").ok);
  assert.deepEqual((judge(grid("", "D4 E5 F6 G7"), "H8", "w") as { five: string[] }).five, ["D4", "E5", "F6", "G7", "H8"]);
  assert.equal((judge(grid("D12 E11 F10 G9"), "H8", "b") as { five: string[] | null }).five?.length, 5);
  assert.equal((judge(grid("C8 D8 E8 F8 H8"), "G8", "b") as { five: string[] }).five.length, 6, "six counts as a win");
  assert.equal((judge(grid("D8 E8 F8"), "H8", "b") as { five: null }).five, null, "a broken four is not five");
  assert.deepEqual(judge(grid("H8"), "H8", "w"), { ok: false, reason: "occupied" });
});

test("double-three is forbidden: open, split and diagonal threes", () => {
  // .XX?. horizontally + vertically
  assert.deepEqual(judge(grid("F8 G8 H6 H7"), "H8", "b"), { ok: false, reason: "double-three" });
  // split three X.X? horizontally + diagonal
  assert.deepEqual(judge(grid("E8 G8 F6 G7"), "H8", "b"), { ok: false, reason: "double-three" });
  assert.ok(judge(grid("", "F8 G8 H6 H7"), "H8", "w").ok, "default rule: white may play a double-three");
  assert.deepEqual(judge(grid("", "F8 G8 H6 H7"), "H8", "w", "both"), { ok: false, reason: "double-three" });
  assert.ok(judge(grid("F8 G8 H6 H7"), "H8", "b", "none").ok, "'none' allows it for black too");
  assert.ok(judge(grid("F8 G8 H6"), "H8", "b").ok, "a single three is fine");
});

test("blocked or edge threes are not open threes", () => {
  // O.XX?.O style: both extensions end against white, so no straight four is possible
  assert.ok(judge(grid("F8 G8 H6 H7", "D8 J8"), "H8", "b").ok, "horizontal three capped on both sides");
  assert.ok(judge(grid("F8 G8 H6 H7", "E8"), "H8", "b").ok, "capped one side: F8-G8-H8 can only become a closed four");
  // three on the board edge: A1-A2-A3 needs A0 for a straight four
  assert.ok(judge(grid("A1 A2 B4 C4"), "A3", "b").ok);
});

test("a four plus a three is allowed, and double-three that makes five is allowed", () => {
  // X.XX? horizontally would be a four (gap makes five), so only the vertical three counts.
  assert.ok(judge(grid("D8 F8 G8 H6 H7"), "H8", "b").ok, "4-3 is legal");
  assert.ok(judge(grid("D8 E8 F8 G8 H6 H7 J7 K6"), "H8", "b").ok, "winning move overrides double-three");
  // 4-4 is not forbidden in this rule set
  assert.ok(judge(grid("E8 F8 G8 H5 H6 H7"), "H8", "b").ok);
});

test("forbidden points are listed and excluded from AI candidates", () => {
  const g = grid("F8 G8 H6 H7", "A1 A3");
  assert.deepEqual(forbiddenPoints(g, "b"), ["H8"]);
  assert.deepEqual(forbiddenPoints(g, "b", "none"), []);
  assert.deepEqual(forbiddenPoints(grid("", "F8 G8 H6 H7"), "w"), [], "white has no forbidden points by default");
  assert.ok(!nearbyLegalPoints(g, "b").includes("H8"));
  assert.ok(nearbyLegalPoints(g, "w").includes("H8"));
});

test("candidates are a fixed neighbourhood, the 5×5 centre on an empty board", () => {
  assert.equal(nearbyLegalPoints(emptyGrid(), "b").length, 25);
  const g = gridFrom(["H8"]);
  assert.equal(nearbyLegalPoints(g, "w").length, 24);
});
