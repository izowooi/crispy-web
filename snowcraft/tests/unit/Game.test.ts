// Tests for the faithful Game module port (Snowcraft1Rewrite + AGame).
// Source-of-truth files (citations in each test):
//   decompiled/scripts/scripts/__Packages/com/iconnicholson/onehammer/Snowcraft1Rewrite.as
//   decompiled/scripts/scripts/__Packages/com/iconnicholson/onehammer/AGame.as
//   decompiled/scripts/scripts/frame_5/DoAction.as
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Game, buildGreenDudieStartingPoints } from "../../src/core/Game";

// Minimal stage/sounds/titles harness — these mirror the Flash MC objects
// the original AS code talked to. Ports keep the surface tiny and observable.
function makeTitles() {
  // Mirrors _root.titles. AS uses gotoAndPlay("levelx"|"seasonsgreetings"|"gameoverwin"|"gameoverlose"|"credits"|"error")
  // and reads .lev / .score / ._visible.
  const calls: string[] = [];
  return {
    _visible: false,
    lev: 0 as number,
    score: 0 as number,
    calls,
    gotoAndPlay(label: string) {
      calls.push(label);
    },
  };
}

function makeSounds() {
  const calls: string[] = [];
  return {
    _currentframe: 1,
    calls,
    gotoAndPlay(label: string) {
      calls.push(label);
    },
  };
}

function makeStage() {
  // Stage container (gamemc); the dudies/snowballs are attached but our
  // engine treats it as opaque. We just track attachMovie() calls for parity.
  const attached: string[] = [];
  return {
    attached,
    attachMovie(linkage: string) {
      attached.push(linkage);
      return {};
    },
    _xmouse: 0,
    _ymouse: 0,
  };
}

describe("Game — buildGreenDudieStartingPoints (level table)", () => {
  // from scripts/__Packages/com/iconnicholson/onehammer/Snowcraft1Rewrite.as:41-210
  const points = buildGreenDudieStartingPoints();

  it("has 14 levels (9 original + 5 extended; win triggers at the last)", () => {
    // Win at `lev == greendudiestartingpoints.length` (Snowcraft1Rewrite.as:309-311).
    // Original 9 (indices 0..8) + extended campaign 10..14 (indices 9..13).
    expect(points.length).toBe(14);
  });

  it("extended levels 10..14 have 6,7,8,9,10 greens, all spawning off-left", () => {
    expect(points.slice(9).map((p) => p.length)).toEqual([6, 7, 8, 9, 10]);
    for (const lvl of points.slice(9)) {
      for (const [sx, , tx] of lvl) {
        expect(sx).toBeLessThan(0);
        expect(tx).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("level 1 has 3 greens at fixed positions", () => {
    // from Snowcraft1Rewrite.as:42-45
    expect(points[0]).toEqual([
      [-20, -60, 180, 40],
      [-130, -60, 70, 40],
      [-130, 1, 70, 100],
    ]);
  });

  it("level 2 has 5 greens", () => {
    // from Snowcraft1Rewrite.as:46-51
    expect(points[1].length).toBe(5);
    expect(points[1][3]).toEqual([-50, -100, -2, -99]);
    expect(points[1][4]).toEqual([-50, 1, -49, 1]);
  });

  it("level 3 has 7 greens", () => {
    // from Snowcraft1Rewrite.as:52-59
    expect(points[2].length).toBe(7);
  });

  it("level 4 has 9 greens; entries 7,8 duplicate 5,6 (verbatim source quirk)", () => {
    // from Snowcraft1Rewrite.as:60-69
    expect(points[3].length).toBe(9);
    expect(points[3][7]).toEqual(points[3][5]);
    expect(points[3][8]).toEqual(points[3][6]);
  });

  it("level 5 reproduces the 83-95 overwrite anomaly then applies (-400,-200) shift to walkEnd", () => {
    // from Snowcraft1Rewrite.as:70-102 — the second [4] block at :83-95 overwrites the first,
    // then a transform loop at :96-102 sets entry[0] = entry[2] - 400 and entry[1] = entry[3] - 200.
    expect(points[4].length).toBe(12);
    // After overwrite + shift, entry [5] walkEnd = (160, 80), so start = (160-400, 80-200) = (-240, -120).
    expect(points[4][5]).toEqual([-240, -120, 160, 80]);
    // entry [6] walkEnd from overwrite = (270, 90)
    expect(points[4][6]).toEqual([-130, -110, 270, 90]);
    // entry [9] walkEnd = (400, 150)
    expect(points[4][9]).toEqual([0, -50, 400, 150]);
    // entry [10] walkEnd = (-51, 151) (kept from overwrite block, NOT replaced again)
    expect(points[4][10]).toEqual([-451, -49, -51, 151]);
  });

  it("level 6: first 6 spawn at x=-450-i*8, y=walkEndY; last 6 spawn at x=walkEndX, y=-350-i*8", () => {
    // from Snowcraft1Rewrite.as:116-130
    expect(points[5].length).toBe(12);
    // i=0 → x = -450, y = walkEndY = 40
    expect(points[5][0][0]).toBe(-450);
    expect(points[5][0][1]).toBe(40);
    expect(points[5][0][2]).toBe(520);
    // i=5 → x = -450 - 5*8 = -490, y = walkEndY = 250
    expect(points[5][5][0]).toBe(-490);
    expect(points[5][5][1]).toBe(250);
    // i=6 → x = walkEndX, y = -350 - 6*8 = -398
    expect(points[5][6][0]).toBe(470);
    expect(points[5][6][1]).toBe(-398);
    // i=11 → x = walkEndX = 180, y = -350 - 11*8 = -438
    expect(points[5][11][0]).toBe(180);
    expect(points[5][11][1]).toBe(-438);
  });

  it("level 7 split: top-3 → y=-250, mid-3 → y=-350, last-6 → (walkX-400, walkY-200)", () => {
    // from Snowcraft1Rewrite.as:131-163
    expect(points[6].length).toBe(12);
    // i=0 → walkX = 400, y = -250
    expect(points[6][0][0]).toBe(400);
    expect(points[6][0][1]).toBe(-250);
    // i=2 → walkX = 435, y = -250
    expect(points[6][2][0]).toBe(435);
    expect(points[6][2][1]).toBe(-250);
    // i=3 → walkX = 345, y = -350
    expect(points[6][3][0]).toBe(345);
    expect(points[6][3][1]).toBe(-350);
    // i=5 → walkX = 350, y = -350
    expect(points[6][5][0]).toBe(350);
    expect(points[6][5][1]).toBe(-350);
    // i=6 → walkX-400, walkY-200 = (85-400=-315, 220-200=20)
    expect(points[6][6][0]).toBe(-315);
    expect(points[6][6][1]).toBe(20);
    // i=11 → (125-400, 290-200) = (-275, 90)
    expect(points[6][11][0]).toBe(-275);
    expect(points[6][11][1]).toBe(90);
  });

  it("level 8 mirrors top-6 from [+6][2]+150 / [+6][3]-150 then shifts (-400, -200)", () => {
    // from Snowcraft1Rewrite.as:164-188
    expect(points[7].length).toBe(12);
    // For i<6: walkX = points[7][i+6].walkX(orig) + 150, walkY = points[7][i+6].walkY(orig) - 150,
    // then x = walkX - 400, y = walkY - 200.
    // Originals at i+6 are from [7][6..11] = [(85,220),(135,220),(180,220),(110,260),(155,260),(125,290)]
    // i=0: walkX = 85+150=235, walkY=220-150=70 → x=-165, y=-130
    expect(points[7][0]).toEqual([-165, -130, 235, 70]);
    // i=5: walkX = 125+150=275, walkY=290-150=140 → x=-125, y=-60
    expect(points[7][5]).toEqual([-125, -60, 275, 140]);
    // For i>=6: just shift original [7][i] by (-400,-200).
    // i=6 original = (85,220) → x=85-400=-315, y=220-200=20
    expect(points[7][6]).toEqual([-315, 20, 85, 220]);
    // i=11 original = (125,290) → x=-275, y=90
    expect(points[7][11]).toEqual([-275, 90, 125, 290]);
  });

  it("level 9 (bonus) has 50 entries; only first 12 are post-processed (uses [4].length=12)", () => {
    // from Snowcraft1Rewrite.as:189-210 — the loop at :197 uses
    // `this.greendudiestartingpoints[4].length` (=12), so only the first 12 are touched.
    // First 10 get (-400, -200) shift; entries 10..11 get only x shifted by -400 (y kept).
    // Remaining 38 (indices 12..49) keep raw [-50,100,...] starts.
    expect(points[8].length).toBe(50);
    for (let i = 0; i < 10; i++) {
      const e = points[8][i];
      // start = walkEnd - (400, 200)
      expect(e[0]).toBe(e[2] - 400);
      expect(e[1]).toBe(e[3] - 200);
    }
    for (let i = 10; i < 12; i++) {
      const e = points[8][i];
      expect(e[0]).toBe(e[2] - 400);
      expect(e[1]).toBe(e[3]); // y is NOT shifted in the else branch
    }
    for (let i = 12; i < 50; i++) {
      const e = points[8][i];
      // Untouched starts keep the literal (-50, 100) from the push.
      expect(e[0]).toBe(-50);
      expect(e[1]).toBe(100);
    }
  });
});

describe("Game — constructor & initial state", () => {
  it("constructs with paused=true (AGame default), gameover=false, score=0, lev unset", () => {
    // from AGame.as:4 (paused = true)
    // from Snowcraft1Rewrite.as:12, 19-20 (gameover=false, slomo=0, score=0)
    const titles = makeTitles();
    const sounds = makeSounds();
    const stage = makeStage();
    const g = new Game({ stage, titles, sounds });
    expect(g.paused).toBe(true);
    expect(g.gameover).toBe(false);
    expect(g.score).toBe(0);
    expect(g.slomo).toBe(0);
    expect(g.lev).toBeUndefined();
    expect(g.adudies).toEqual([]);
    expect(g.snowballs).toEqual([]);
  });

  it("exposes the fixed reddudie spawn anchors", () => {
    // from Snowcraft1Rewrite.as:13-18
    const g = new Game({ stage: makeStage(), titles: makeTitles(), sounds: makeSounds() });
    expect(g.reddudie1startx).toBe(450);
    expect(g.reddudie1starty).toBe(200);
    expect(g.reddudie2startx).toBe(420);
    expect(g.reddudie2starty).toBe(260);
    expect(g.reddudie3startx).toBe(310);
    expect(g.reddudie3starty).toBe(250);
  });
});

describe("Game — reset()", () => {
  it("resets starttime, hides titles, clears gameover, zeros score", () => {
    // from Snowcraft1Rewrite.as:444-450
    const titles = makeTitles();
    titles._visible = true;
    const g = new Game({ stage: makeStage(), titles, sounds: makeSounds() });
    g.gameover = true;
    g.score = 42;
    g.reset();
    expect(g.gameover).toBe(false);
    expect(g.score).toBe(0);
    expect(titles._visible).toBe(false);
    expect(g.starttime).toBeInstanceOf(Date);
  });
});

describe("Game — dolevel(n) state transitions", () => {
  it("level 1 plays titles 'seasonsgreetings'", () => {
    // from Snowcraft1Rewrite.as:232-235
    const titles = makeTitles();
    const g = new Game({ stage: makeStage(), titles, sounds: makeSounds() });
    g.dolevel(1);
    expect(g.lev).toBe(1);
    expect(titles.calls).toContain("seasonsgreetings");
  });

  it("level >1 plays 'levelx' and writes titles.lev", () => {
    // from Snowcraft1Rewrite.as:236-240
    const titles = makeTitles();
    const g = new Game({ stage: makeStage(), titles, sounds: makeSounds() });
    g.dolevel(2);
    expect(g.lev).toBe(2);
    expect(titles.lev).toBe(2);
    expect(titles.calls).toContain("levelx");
  });

  it("spawns exactly 3 reds at fixed anchors offset by (+200, +100)", () => {
    // from Snowcraft1Rewrite.as:242-259
    const g = new Game({ stage: makeStage(), titles: makeTitles(), sounds: makeSounds() });
    g.dolevel(1);
    const reds = g.adudies.filter((d: any) => d.team === "red");
    expect(reds.length).toBe(3);
    // Walk-end anchors equal the fixed reddudieNstart{x,y}.
    expect(reds[0].walkendx).toBe(450);
    expect(reds[0].walkendy).toBe(200);
    expect(reds[1].walkendx).toBe(420);
    expect(reds[1].walkendy).toBe(260);
    expect(reds[2].walkendx).toBe(310);
    expect(reds[2].walkendy).toBe(250);
    // Initial position = anchor + (200, 100).
    expect(reds[0].x).toBe(650);
    expect(reds[0].y).toBe(300);
    expect(reds[1].x).toBe(620);
    expect(reds[1].y).toBe(360);
    expect(reds[2].x).toBe(510);
    expect(reds[2].y).toBe(350);
  });

  it("spawns N greens per level (1→3, 2→5, 3→7, 4→9, 5→12, 6→12, 7→12, 8→12, 9→50)", () => {
    // from Snowcraft1Rewrite.as:264-282
    const counts: Record<number, number> = { 1: 3, 2: 5, 3: 7, 4: 9, 5: 12, 6: 12, 7: 12, 8: 12, 9: 50 };
    for (const [lvlStr, expected] of Object.entries(counts)) {
      const lvl = Number(lvlStr);
      const g = new Game({ stage: makeStage(), titles: makeTitles(), sounds: makeSounds() });
      g.dolevel(lvl);
      const greens = g.adudies.filter((d: any) => d.team === "green");
      expect(greens.length).toBe(expected);
    }
  });

  it("level 5 sets green walkspeed=10", () => {
    // from Snowcraft1Rewrite.as:273-276 — `if (level == 5 || level > 6) setwalkspeed(10)`
    const g = new Game({ stage: makeStage(), titles: makeTitles(), sounds: makeSounds() });
    g.dolevel(5);
    const greens = g.adudies.filter((d: any) => d.team === "green");
    expect(greens.every((d: any) => d.walkspeed === 10)).toBe(true);
  });

  it("level 6 sets green walkspeed=15", () => {
    // from Snowcraft1Rewrite.as:277-280
    const g = new Game({ stage: makeStage(), titles: makeTitles(), sounds: makeSounds() });
    g.dolevel(6);
    const greens = g.adudies.filter((d: any) => d.team === "green");
    expect(greens.every((d: any) => d.walkspeed === 15)).toBe(true);
  });

  it("level 7,8,9 set green walkspeed=10 (level > 6 branch)", () => {
    // from Snowcraft1Rewrite.as:273-276
    for (const lvl of [7, 8, 9]) {
      const g = new Game({ stage: makeStage(), titles: makeTitles(), sounds: makeSounds() });
      g.dolevel(lvl);
      const greens = g.adudies.filter((d: any) => d.team === "green");
      expect(greens.every((d: any) => d.walkspeed === 10)).toBe(true);
    }
  });

  it("levels 1..4 leave walkspeed at default (5)", () => {
    // from ASnowDudie.as:11 (walkspeed = 5) and Snowcraft1Rewrite.as:273-280 (no override)
    for (const lvl of [1, 2, 3, 4]) {
      const g = new Game({ stage: makeStage(), titles: makeTitles(), sounds: makeSounds() });
      g.dolevel(lvl);
      const greens = g.adudies.filter((d: any) => d.team === "green");
      expect(greens.every((d: any) => d.walkspeed === 5)).toBe(true);
    }
  });

  it("clearbetweenlevels: switching levels destroys previous dudies and starts fresh", () => {
    // from Snowcraft1Rewrite.as:230 (clearbetweenlevels) and :434-443
    const g = new Game({ stage: makeStage(), titles: makeTitles(), sounds: makeSounds() });
    g.dolevel(1);
    const beforeCount = g.adudies.length;
    expect(beforeCount).toBe(3 + 3); // 3 reds + 3 greens
    g.dolevel(2);
    expect(g.adudies.length).toBe(3 + 5); // 3 reds + 5 greens
  });
});

describe("Game — throwball(eventObject) spawns SnowBall", () => {
  it("pushes a snowball with team/force/x/y from the event payload", () => {
    // from Snowcraft1Rewrite.as:284-288
    const g = new Game({ stage: makeStage(), titles: makeTitles(), sounds: makeSounds() });
    g.throwball({ team: "red", force: 0.5, x: 100, y: 50, ineffective: false });
    expect(g.snowballs.length).toBe(1);
    const b = g.snowballs[0];
    expect(b.team).toBe("red");
    expect(b.force).toBe(0.5);
    expect(b.ballmc._x).toBe(100);
    expect(b.ballmc._y).toBe(50);
    expect(b.ineffective).toBe(false);
  });

  it("propagates the ineffective flag (force < 0.1 from RedSnowDudie.throwball)", () => {
    // from RedSnowDudie.as:108-118
    const g = new Game({ stage: makeStage(), titles: makeTitles(), sounds: makeSounds() });
    g.throwball({ team: "red", force: 0.05, x: 0, y: 0, ineffective: true });
    expect(g.snowballs[0].ineffective).toBe(true);
  });
});

describe("Game — frameloop hit detection (red ball → green dudie)", () => {
  it("|ball.x - green.x| < 30 AND |ball.y - (green.y - 20)| < 30 → green takes hit, score += 10, ball dies", () => {
    // from Snowcraft1Rewrite.as:366-371 — note hit-check reads dudiemc._x/_y on the clip,
    // which setposition() syncs from instance x/y.
    const g = new Game({ stage: makeStage(), titles: makeTitles(), sounds: makeSounds() });
    g.dolevel(1);
    const green = g.adudies.find((d: any) => d.team === "green") as any;
    green.setposition(100, 100);
    // Ball center within 30 of green.x and within 30 of (green.y - 20) = 80.
    g.throwball({ team: "red", force: 0.5, x: 100, y: 80, ineffective: false });
    const ball = g.snowballs[0];
    const beforeHp = green.hitpoints;
    g.frameloop();
    expect(ball.dead).toBe(true);
    expect(g.score).toBe(10);
    expect(green.hitpoints).toBe(beforeHp - 1);
  });

  it("ineffective red ball does NOT hit", () => {
    // from Snowcraft1Rewrite.as:366 — `&& !_loc2_.ineffective`
    const g = new Game({ stage: makeStage(), titles: makeTitles(), sounds: makeSounds() });
    g.dolevel(1);
    const green = g.adudies.find((d: any) => d.team === "green") as any;
    green.setposition(100, 100);
    g.throwball({ team: "red", force: 0.05, x: 100, y: 80, ineffective: true });
    g.frameloop();
    expect(g.score).toBe(0);
  });

  it("red ball does NOT hit a green that is already 'down'", () => {
    // from Snowcraft1Rewrite.as:366 — `&& !_loc4_.down`
    const g = new Game({ stage: makeStage(), titles: makeTitles(), sounds: makeSounds() });
    g.dolevel(1);
    const green = g.adudies.find((d: any) => d.team === "green") as any;
    green.setposition(100, 100);
    green.down = true;
    g.throwball({ team: "red", force: 0.5, x: 100, y: 80, ineffective: false });
    g.frameloop();
    expect(g.score).toBe(0);
  });
});

describe("Game — frameloop hit detection (green ball → red dudie)", () => {
  it("hits a red dudie and decrements its hitpoints; no score awarded", () => {
    // from Snowcraft1Rewrite.as:373-381 — note: only red→green awards score (line 369).
    const g = new Game({ stage: makeStage(), titles: makeTitles(), sounds: makeSounds() });
    g.dolevel(1);
    const red = g.adudies.find((d: any) => d.team === "red") as any;
    red.setposition(200, 100);
    g.throwball({ team: "green", force: 0.5, x: 200, y: 80, ineffective: false });
    const beforeHp = red.hitpoints;
    const ball = g.snowballs[0];
    g.frameloop();
    // The ball is dead AND was removed during cleanup at Snowcraft1Rewrite.as:402-408.
    expect(ball.dead).toBe(true);
    expect(g.snowballs.length).toBe(0);
    expect(red.hitpoints).toBe(beforeHp - 1);
    expect(g.score).toBe(0);
  });
});

describe("Game — frameloop snowball cleanup", () => {
  it("removes snowballs with |x|>2999 or |y|>2999", () => {
    // from Snowcraft1Rewrite.as:384
    const g = new Game({ stage: makeStage(), titles: makeTitles(), sounds: makeSounds() });
    g.dolevel(1);
    g.throwball({ team: "red", force: 0.5, x: 3000, y: 0, ineffective: false });
    expect(g.snowballs.length).toBe(1);
    g.frameloop();
    expect(g.snowballs.length).toBe(0);
  });

  it("removes snowballs whose .dead is set", () => {
    // from Snowcraft1Rewrite.as:384 — `|| _loc2_.dead`
    const g = new Game({ stage: makeStage(), titles: makeTitles(), sounds: makeSounds() });
    g.dolevel(1);
    g.throwball({ team: "red", force: 0.5, x: 0, y: 0, ineffective: false });
    g.snowballs[0].dead = true;
    g.frameloop();
    expect(g.snowballs.length).toBe(0);
  });
});

describe("Game — frameloop win/lose state machine", () => {
  it("all greens dead AND not on last level → advance to next level (lev+1)", () => {
    // from Snowcraft1Rewrite.as:307-317
    const g = new Game({ stage: makeStage(), titles: makeTitles(), sounds: makeSounds() });
    g.dolevel(1);
    expect(g.lev).toBe(1);
    for (const d of g.adudies as any[]) {
      if (d.team === "green") d.dead = true;
    }
    g.frameloop();
    expect(g.lev).toBe(2);
  });

  it("all greens dead AND on last level (14) → ongameover(true)", () => {
    // Win at `lev == greendudiestartingpoints.length` (Snowcraft1Rewrite.as:309-311).
    // With the extended campaign the last level is now 14, not 9.
    const g = new Game({ stage: makeStage(), titles: makeTitles(), sounds: makeSounds() });
    g.dolevel(14);
    for (const d of g.adudies as any[]) {
      if (d.team === "green") d.dead = true;
    }
    g.frameloop();
    expect(g.gameover).toBe(true);
  });

  it("clearing the original last level (9) now ADVANCES to 10 (extended campaign)", () => {
    const g = new Game({ stage: makeStage(), titles: makeTitles(), sounds: makeSounds() });
    g.dolevel(9);
    for (const d of g.adudies as any[]) {
      if (d.team === "green") d.dead = true;
    }
    g.frameloop();
    expect(g.gameover).toBe(false);
    expect(g.lev).toBe(10);
  });

  it("all reds dead → ongameover(false), greens get .gameover() called", () => {
    // from Snowcraft1Rewrite.as:334-353
    const g = new Game({ stage: makeStage(), titles: makeTitles(), sounds: makeSounds() });
    g.dolevel(1);
    for (const d of g.adudies as any[]) {
      if (d.team === "red") d.dead = true;
    }
    const greenGameoverCalls: any[] = [];
    for (const d of g.adudies as any[]) {
      if (d.team === "green") {
        const orig = d.gameover.bind(d);
        d.gameover = () => {
          greenGameoverCalls.push(d);
          orig();
        };
      }
    }
    g.frameloop();
    expect(g.gameover).toBe(true);
    expect(greenGameoverCalls.length).toBeGreaterThan(0);
  });
});

describe("Game — ongameover() time bonus", () => {
  it("on win, if elapsed < 1,800,000 ms → score += round((1,800,000 - elapsed) / 1000)", () => {
    // from Snowcraft1Rewrite.as:410-422
    const titles = makeTitles();
    const g = new Game({ stage: makeStage(), titles, sounds: makeSounds() });
    g.score = 100;
    // Force starttime to 600 seconds ago so elapsed = 600_000 ms; bonus = (1_800_000 - 600_000) / 1000 = 1200.
    g.starttime = new Date(Date.now() - 600_000);
    g.ongameover(true);
    expect(g.score).toBe(100 + 1200);
    expect(g.gameover).toBe(true);
    expect(titles.score).toBe(g.score);
    expect(titles.calls).toContain("gameoverwin");
  });

  it("on win, if elapsed >= 1,800,000 ms → no bonus", () => {
    // from Snowcraft1Rewrite.as:416 — `if (_loc2_ < 1800000)` only.
    const g = new Game({ stage: makeStage(), titles: makeTitles(), sounds: makeSounds() });
    g.score = 50;
    g.starttime = new Date(Date.now() - 1_900_000); // 1,900,000 ms ago
    g.ongameover(true);
    expect(g.score).toBe(50);
    expect(g.gameover).toBe(true);
  });

  it("on lose, plays gameoverlose and never adds bonus", () => {
    // from Snowcraft1Rewrite.as:414-429
    const titles = makeTitles();
    const g = new Game({ stage: makeStage(), titles, sounds: makeSounds() });
    g.score = 73;
    g.starttime = new Date(Date.now() - 1000);
    g.ongameover(false);
    expect(g.score).toBe(73);
    expect(g.gameover).toBe(true);
    expect(titles.calls).toContain("gameoverlose");
    expect(titles.calls).not.toContain("gameoverwin");
  });

  it("dispatches a 'gameover' event to listeners", () => {
    // from AGame.as:11-15 and Snowcraft1Rewrite.as:431-432
    const g = new Game({ stage: makeStage(), titles: makeTitles(), sounds: makeSounds() });
    g.starttime = new Date();
    const handler = vi.fn();
    g.addEventListener("gameover", { gameover: handler });
    g.ongameover(false);
    expect(handler).toHaveBeenCalledOnce();
    const evt = handler.mock.calls[0][0];
    expect(evt.type).toBe("gameover");
    expect(evt.target).toBe(g);
  });
});

describe("Game — keyboard handling", () => {
  it("Shift down/up toggles shiftdown flag", () => {
    // from Snowcraft1Rewrite.as:214-227 — only key 16 (Shift) is tracked.
    const g = new Game({ stage: makeStage(), titles: makeTitles(), sounds: makeSounds() });
    expect(g.shiftdown).toBeFalsy();
    g.keydown(16);
    expect(g.shiftdown).toBe(true);
    g.keyup(16);
    expect(g.shiftdown).toBe(false);
  });

  it("non-Shift keys do not change shiftdown", () => {
    // from Snowcraft1Rewrite.as:214-227
    const g = new Game({ stage: makeStage(), titles: makeTitles(), sounds: makeSounds() });
    g.keydown(65);
    expect(g.shiftdown).toBeFalsy();
  });
});

describe("Game — high-level state machine label", () => {
  it("starts in 'title' before dolevel()", () => {
    // No explicit state field in AS, but spec asks for: title → playing → level-clear → next → game-over.
    // We surface a phase getter for the porting harness; 'title' before any dolevel().
    const g = new Game({ stage: makeStage(), titles: makeTitles(), sounds: makeSounds() });
    expect(g.phase).toBe("title");
  });

  it("enters 'playing' after dolevel(1)", () => {
    // from frame_5/DoAction.as:11 — `_root.game.dolevel(1)` is the entry point.
    const g = new Game({ stage: makeStage(), titles: makeTitles(), sounds: makeSounds() });
    g.dolevel(1);
    expect(g.phase).toBe("playing");
  });

  it("transitions to 'game-over' on ongameover()", () => {
    // from Snowcraft1Rewrite.as:421 — gameover = true.
    const g = new Game({ stage: makeStage(), titles: makeTitles(), sounds: makeSounds() });
    g.dolevel(1);
    g.starttime = new Date();
    g.ongameover(false);
    expect(g.phase).toBe("game-over");
  });

  it("frameloop after killing all greens transitions through 'level-clear'/'next' to advance lev", () => {
    // from Snowcraft1Rewrite.as:289-317 — when all greens dead and not last level → dolevel(lev+1).
    const g = new Game({ stage: makeStage(), titles: makeTitles(), sounds: makeSounds() });
    g.dolevel(1);
    for (const d of g.adudies as any[]) if (d.team === "green") d.dead = true;
    g.frameloop();
    // After advance, we are playing level 2.
    expect(g.lev).toBe(2);
    expect(g.phase).toBe("playing");
  });
});
