// Game — faithful port of:
//   decompiled/scripts/scripts/__Packages/com/iconnicholson/onehammer/AGame.as
//   decompiled/scripts/scripts/__Packages/com/iconnicholson/onehammer/Snowcraft1Rewrite.as
//
// State machine (per task brief): title → playing → level-clear → next → game-over.
// In the original AS the only persistent state flags are `gameover: boolean` and
// `lev: int`; the other phases are implicit transitions during a single
// frameloop() tick. We surface them via a `phase` getter for the porting harness.
//
// All numeric constants and branch structure below are quoted with line refs to
// the AS source. Do not edit a constant without an accompanying source citation.

export type Team = "red" | "green";

// Extended (non-original) campaign levels 10..14 — see levelConfig.ts.
import { GREEN_DOWN_RECOVERY_FRAMES } from "./AI.ts";
import { EXTRA_LEVELS } from "./levelConfig.ts";

// ---------------------------------------------------------------------------
// Level table — Snowcraft1Rewrite.as:41-210
//   greendudiestartingpoints[level-1] is an Array of [startX, startY, walkEndX, walkEndY] tuples.
// ---------------------------------------------------------------------------

export type GreenStart = [number, number, number, number];

export function buildGreenDudieStartingPoints(): GreenStart[][] {
  const p: GreenStart[][] = [];

  // Level 1 — Snowcraft1Rewrite.as:42-45
  p[0] = [
    [-20, -60, 180, 40],
    [-130, -60, 70, 40],
    [-130, 1, 70, 100],
  ];

  // Level 2 — Snowcraft1Rewrite.as:46-51
  p[1] = [
    [-20, -60, 180, 40],
    [-130, -60, 70, 40],
    [-130, 1, 70, 100],
    [-50, -100, -2, -99],
    [-50, 1, -49, 1],
  ];

  // Level 3 — Snowcraft1Rewrite.as:52-59
  p[2] = [
    [-20, -60, 180, 40],
    [-130, -60, 70, 40],
    [-130, 1, 70, 100],
    [-50, 100, -51, 101],
    [-50, 150, -51, 151],
    [-100, -50, -101, -51],
    [-150, -50, -151, -50],
  ];

  // Level 4 — Snowcraft1Rewrite.as:60-69 (entries 7,8 verbatim duplicate 5,6)
  p[3] = [
    [-20, -60, 180, 40],
    [-130, -60, 70, 40],
    [-130, 1, 70, 100],
    [-50, 100, -51, 101],
    [-50, 150, -51, 151],
    [-100, -50, -101, -51],
    [-150, -50, -151, -50],
    [-100, -50, -101, -51],
    [-150, -50, -151, -50],
  ];

  // Level 5 — Snowcraft1Rewrite.as:70-102.
  // The first [4] block at :70-82 is *overwritten* at :83-95 (verbatim source quirk).
  // Only the second block survives. Then :96-102 transforms each entry by
  // (entry[0],entry[1]) = (entry[2]-400, entry[3]-200).
  p[4] = [
    [-20, -60, 180, 40],
    [-130, -60, 70, 40],
    [-130, 1, 70, 100],
    [-50, 100, -51, 101],
    [-50, 150, -51, 151],
    [160, -50, 160, 80],
    [-150, -50, 270, 90],
    [-100, -50, 160, 150],
    [-150, -50, 300, 140],
    [-50, 100, 400, 150],
    [-50, 150, -51, 151],
    [-50, 100, 300, 205],
  ];
  for (let i = 0; i < p[4].length; i++) {
    p[4][i][0] = p[4][i][2] - 400;
    p[4][i][1] = p[4][i][3] - 200;
  }

  // Level 6 — Snowcraft1Rewrite.as:103-130.
  // Initial table at :104-115, then loop at :116-130:
  //   if (i < 6)  start = (-450 - i*8, walkEndY)
  //   else        start = (walkEndX, -350 - i*8)
  p[5] = [
    [-20, -60, 520, 40],
    [-130, -60, 460, 80],
    [-130, 1, 400, 130],
    [-50, 100, 340, 165],
    [-50, 150, 280, 200],
    [160, -50, 230, 250],
    [-150, -50, 470, 40],
    [-100, -50, 410, 80],
    [-150, -50, 340, 130],
    [-50, 100, 280, 165],
    [-50, 150, 230, 200],
    [-50, 100, 180, 250],
  ];
  for (let i = 0; i < p[5].length; i++) {
    if (i < 6) {
      p[5][i][0] = -450 - i * 8;
      p[5][i][1] = p[5][i][3];
    } else {
      p[5][i][0] = p[5][i][2];
      p[5][i][1] = -350 - i * 8;
    }
  }

  // Level 7 — Snowcraft1Rewrite.as:131-163.
  // The loop at :144-163 is bounded by `greendudiestartingpoints[4].length` (=12),
  // and per-i:
  //   i < 3 → start = (walkEndX, -250)
  //   i < 6 → start = (walkEndX, -350)
  //   else  → start = (walkEndX-400, walkEndY-200)
  p[6] = [
    [-20, -60, 400, 80],
    [-130, -60, 435, 70],
    [-130, 1, 435, 105],
    [-50, 100, 345, 135],
    [-50, 150, 310, 175],
    [160, -50, 350, 175],
    [-150, -50, 85, 220],
    [-100, -50, 135, 220],
    [-150, -50, 180, 220],
    [-50, 100, 110, 260],
    [-50, 150, 155, 260],
    [-50, 100, 125, 290],
  ];
  // The AS source uses `greendudiestartingpoints[4].length` which is also 12 here.
  const len4_l7 = p[4].length;
  for (let i = 0; i < len4_l7; i++) {
    if (i < 3) {
      p[6][i][0] = p[6][i][2];
      p[6][i][1] = -250;
    } else if (i < 6) {
      p[6][i][0] = p[6][i][2];
      p[6][i][1] = -350;
    } else {
      p[6][i][0] = p[6][i][2] - 400;
      p[6][i][1] = p[6][i][3] - 200;
    }
  }

  // Level 8 — Snowcraft1Rewrite.as:164-188. For i<6, walkEnd is OVERWRITTEN
  // from points[7][i+6] with (walkEndX+150, walkEndY-150), then start = (walkEndX-400, walkEndY-200).
  p[7] = [
    [-20, -60, 400, 80],
    [-130, -60, 435, 70],
    [-130, 1, 435, 105],
    [-50, 100, 345, 135],
    [-50, 150, 310, 175],
    [160, -50, 350, 175],
    [-150, -50, 85, 220],
    [-100, -50, 135, 220],
    [-150, -50, 180, 220],
    [-50, 100, 110, 260],
    [-50, 150, 155, 260],
    [-50, 100, 125, 290],
  ];
  // Snapshot the right half BEFORE we mutate, because the first half reads
  // greendudiestartingpoints[7][i+6][2], [3] (which are still the originals
  // because only entries i<6 are touched first).
  const len4_l8 = p[4].length;
  for (let i = 0; i < len4_l8; i++) {
    if (i < 6) {
      p[7][i][2] = p[7][i + 6][2] + 150;
      p[7][i][3] = p[7][i + 6][3] - 150;
    }
    p[7][i][0] = p[7][i][2] - 400;
    p[7][i][1] = p[7][i][3] - 200;
  }

  // Level 9 (Bonus) — Snowcraft1Rewrite.as:189-210.
  // 50 entries pushed with deterministic-shaped (-50,100,50+rand*200,50+rand*200).
  // Then the post-process loop is bounded by `greendudiestartingpoints[4].length`
  // (=12), so only the FIRST 12 of the 50 are touched:
  //   i < 10 → start = (walkEndX-400, walkEndY-200)
  //   else (10..11) → start = (walkEndX-400, walkEndY)  (note: y is NOT shifted)
  // Entries 12..49 keep their raw (-50, 100) starts.
  p[8] = [];
  for (let i = 0; i < 50; i++) {
    p[8].push([-50, 100, 50 + Math.random() * 200, 50 + Math.random() * 200]);
  }
  const len4_l9 = p[4].length;
  for (let i = 0; i < len4_l9; i++) {
    if (i < 10) {
      p[8][i][0] = p[8][i][2] - 400;
      p[8][i][1] = p[8][i][3] - 200;
    } else {
      p[8][i][0] = p[8][i][2] - 400;
      p[8][i][1] = p[8][i][3];
    }
  }

  // Append the extended campaign (levels 10..14). Clone each tuple so the
  // shared EXTRA_LEVELS template is never mutated by gameplay/tests.
  for (const extra of EXTRA_LEVELS) {
    p.push(extra.map((g) => [...g] as GreenStart));
  }

  return p;
}

// ---------------------------------------------------------------------------
// Internal entity stubs.
//
// These are minimal placeholders for RedSnowDudie / GreenSnowDudie / SnowBall;
// they expose just enough surface (x, y, dead, hitpoints, dudiemc shim, etc.)
// for Game.frameloop and dolevel to behave faithfully. Full ports of those
// classes live in Player.ts / AI.ts / Snowball.ts.
// ---------------------------------------------------------------------------

export interface RedDudie {
  team: "red";
  x: number;
  y: number;
  walkendx: number;
  walkendy: number;
  walkspeed: number;
  hitpoints: number;
  dazed: number;
  dead: boolean;
  walking: boolean;
  // AS clip surface used by frameloop hit-detection.
  dudiemc: { _x: number; _y: number };
  setposition(x: number, y: number): void;
  setwalkendx(x: number): void;
  setwalkendy(y: number): void;
  setwalkspeed(s: number): void;
  yougothit(): void;
  frameloop(): void;
  destroy(): void;
  addEventListener(type: string, listener: any): void;
}

export interface GreenDudie {
  team: "green";
  x: number;
  y: number;
  walkendx: number;
  walkendy: number;
  walkspeed: number;
  hitpoints: number;
  balling: number;
  cocking: number;
  down: boolean;
  downRecoveryFrames: number;
  dead: boolean;
  walking: boolean;
  dudiemc: { _x: number; _y: number };
  setposition(x: number, y: number): void;
  setwalkendx(x: number): void;
  setwalkendy(y: number): void;
  setwalkspeed(s: number): void;
  yougothit(): void;
  gameover(): void;
  frameloop(): void;
  destroy(): void;
  addEventListener(type: string, listener: any): void;
}

export interface SnowBallLike {
  team: Team;
  force: number;
  ineffective: boolean;
  dead: boolean;
  ballmc: { _x: number; _y: number; _visible: boolean };
  shadowmc: { _x: number; _y: number };
  /** Per-frame x velocity — SnowBall.as:43-52. Constant after spawn. */
  xmov: number;
  /** Per-frame y velocity — SnowBall.as:43-52. Constant at spawn (mutated in flight). */
  ymov: number;
  frameloop(): void;
  destroy(): void;
}

// Default factories — kept inline so Game.ts is self-contained for this TDD pass.
// When Player.ts / AI.ts / Snowball.ts are ported, callers can override these via
// the constructor's `factories` option.

function defaultRedFactory(stage: any, sounds: any): RedDudie {
  // Reproduces just the constructor surface from RedSnowDudie.as needed by Game.
  // Hitpoints/dazed defaults — RedSnowDudie.as:13-17.
  const dudie: RedDudie = {
    team: "red",
    x: 0,
    y: 0,
    walkendx: 0,
    walkendy: 0,
    walkspeed: 5, // ASnowDudie.as:11
    hitpoints: 2, // RedSnowDudie.as:13
    dazed: 0,
    dead: false,
    walking: false,
    dudiemc: { _x: 0, _y: 0 },
    setposition(x, y) {
      this.x = x;
      this.y = y;
      this.dudiemc._x = x;
      this.dudiemc._y = y;
    },
    setwalkendx(x) {
      this.walkendx = x;
    },
    setwalkendy(y) {
      this.walkendy = y;
    },
    setwalkspeed(s) {
      this.walkspeed = s;
    },
    yougothit() {
      // RedSnowDudie.as:72-89 — first hit dazes, second kills.
      this.hitpoints -= 1;
      if (this.hitpoints === 1) {
        this.dazed = 40;
      } else if (this.hitpoints <= 0) {
        this.dead = true;
      }
    },
    frameloop() {},
    destroy() {},
    addEventListener() {},
  };
  void stage;
  void sounds;
  return dudie;
}

function defaultGreenFactory(stage: any, sounds: any, titles: any): GreenDudie {
  // GreenSnowDudie.as:12-16 + ASnowDudie.as:8-11.
  const dudie: GreenDudie = {
    team: "green",
    x: 0,
    y: 0,
    walkendx: 0,
    walkendy: 0,
    walkspeed: 5,
    hitpoints: 3, // GreenSnowDudie.as:15
    balling: 0,
    cocking: 0,
    down: false,
    downRecoveryFrames: 0,
    dead: false,
    walking: false,
    dudiemc: { _x: 0, _y: 0 },
    setposition(x, y) {
      this.x = x;
      this.y = y;
      this.dudiemc._x = x;
      this.dudiemc._y = y;
    },
    setwalkendx(x) {
      this.walkendx = x;
    },
    setwalkendy(y) {
      this.walkendy = y;
    },
    setwalkspeed(s) {
      this.walkspeed = s;
    },
    yougothit() {
      // GreenSnowDudie.as:43-66 — three-stage hp.
      this.down = false;
      this.downRecoveryFrames = 0;
      this.hitpoints -= 1;
      if (this.hitpoints === 1) {
        this.down = true;
        this.downRecoveryFrames = GREEN_DOWN_RECOVERY_FRAMES;
      } else if (this.hitpoints <= 0) {
        this.dead = true;
      }
    },
    gameover() {
      // GreenSnowDudie.as:71 — taunt on game-over-lose.
    },
    frameloop() {
      if (this.down) {
        if (this.downRecoveryFrames > 0) this.downRecoveryFrames -= 1;
        if (this.downRecoveryFrames <= 0) {
          this.down = false;
          this.downRecoveryFrames = 0;
        }
      }
    },
    destroy() {},
    addEventListener() {},
  };
  void stage;
  void sounds;
  void titles;
  return dudie;
}

function defaultSnowballFactory(
  stage: any,
  sounds: any,
  team: Team,
  force: number,
  x: number,
  y: number,
  ineffective: boolean
): SnowBallLike {
  // SnowBall.as: spawn ballmc/shadowmc at (x,y) — Game only inspects ballmc._x/y.
  // Initial velocity per team — SnowBall.as:43-52 (red xmov=-20,ymov=-10; green xmov=+20,ymov=+10).
  const xmov = team === "red" ? -20 : 20;
  const ymov = team === "red" ? -10 : 10;
  const ball: SnowBallLike = {
    team,
    force,
    ineffective: !!ineffective,
    dead: false,
    ballmc: { _x: x, _y: y, _visible: true },
    shadowmc: { _x: x, _y: y + 35 }, // grounddistance = 35, SnowBall.as:17
    xmov,
    ymov,
    frameloop() {},
    destroy() {},
  };
  void stage;
  void sounds;
  return ball;
}

// ---------------------------------------------------------------------------
// Game class — Snowcraft1Rewrite (extends AGame).
// ---------------------------------------------------------------------------

export interface GameOptions {
  stage: any;
  titles: any;
  sounds: any;
  floop?: any; // optional heartbeat clip; if omitted we don't auto-tick.
  factories?: {
    red?: (stage: any, sounds: any) => RedDudie;
    green?: (stage: any, sounds: any, titles: any) => GreenDudie;
    snowball?: (
      stage: any,
      sounds: any,
      team: Team,
      force: number,
      x: number,
      y: number,
      ineffective: boolean
    ) => SnowBallLike;
  };
}

type Phase = "title" | "playing" | "level-clear" | "next" | "game-over";

export class Game {
  // AGame fields — AGame.as:3-4
  paused: boolean = true;

  // Snowcraft1Rewrite fields — Snowcraft1Rewrite.as:3-20
  stage: any;
  titles: any;
  sounds: any;
  adudies: (RedDudie | GreenDudie)[] = [];
  snowballs: SnowBallLike[] = [];
  greendudiestartingpoints: GreenStart[][];
  lev: number | undefined = undefined;
  shiftdown: boolean = false;
  starttime: Date = new Date();
  gameover: boolean = false;
  slomo: number = 0;
  score: number = 0;

  // Snowcraft1Rewrite.as:13-18 (fixed reddudie spawn anchors).
  reddudie1startx = 450;
  reddudie1starty = 200;
  reddudie2startx = 420;
  reddudie2starty = 260;
  reddudie3startx = 310;
  reddudie3starty = 250;

  // Phase tracking — not in AS source; surfaced for the porting harness.
  private _phase: Phase = "title";

  // EventDispatcher mixin — mx.events.EventDispatcher.initialize(this).
  private _listeners: Map<string, any[]> = new Map();

  // Factory hooks for tests / future ports.
  private _redFactory: (stage: any, sounds: any) => RedDudie;
  private _greenFactory: (stage: any, sounds: any, titles: any) => GreenDudie;
  private _snowballFactory: (
    stage: any,
    sounds: any,
    team: Team,
    force: number,
    x: number,
    y: number,
    ineffective: boolean
  ) => SnowBallLike;

  constructor(opts: GameOptions) {
    // AGame ctor — AGame.as:5-10.
    if (opts.floop) {
      opts.floop.onEnterFrame = () => this.frameloop();
      opts.floop.hackparent = this;
    }

    this.stage = opts.stage;
    this.titles = opts.titles;
    this.sounds = opts.sounds;

    this._redFactory = opts.factories?.red ?? defaultRedFactory;
    this._greenFactory = opts.factories?.green ?? defaultGreenFactory;
    this._snowballFactory = opts.factories?.snowball ?? defaultSnowballFactory;

    this.greendudiestartingpoints = buildGreenDudieStartingPoints();

    // Snowcraft1Rewrite.as:211 — call reset() at end of construction.
    this.reset();
  }

  // -------------------------------------------------------------------------
  // Phase getter — derived from (lev, gameover).
  // -------------------------------------------------------------------------
  get phase(): Phase {
    return this._phase;
  }

  // -------------------------------------------------------------------------
  // EventDispatcher (subset) — mx.events.EventDispatcher.initialize semantics.
  // -------------------------------------------------------------------------
  addEventListener(type: string, listener: any): void {
    const arr = this._listeners.get(type) ?? [];
    arr.push(listener);
    this._listeners.set(type, arr);
  }

  removeEventListener(type: string, listener: any): void {
    const arr = this._listeners.get(type);
    if (!arr) return;
    const i = arr.indexOf(listener);
    if (i >= 0) arr.splice(i, 1);
  }

  dispatchEvent(evt: any): void {
    const arr = this._listeners.get(evt.type) ?? [];
    for (const l of arr) {
      // AS EventDispatcher delivers via listener[type](evt) when the listener
      // is an object, or listener(evt) when it's a function.
      if (typeof l === "function") l(evt);
      else if (typeof l[evt.type] === "function") l[evt.type](evt);
    }
  }

  // -------------------------------------------------------------------------
  // Snowcraft1Rewrite.keydown / keyup — :214-227. Only Shift (16) tracked.
  // -------------------------------------------------------------------------
  keydown(k: number): void {
    if (k === 16) this.shiftdown = true;
  }

  keyup(k: number): void {
    if (k === 16) this.shiftdown = false;
  }

  // -------------------------------------------------------------------------
  // reset() — Snowcraft1Rewrite.as:444-450.
  // -------------------------------------------------------------------------
  reset(): void {
    this.starttime = new Date();
    if (this.titles) this.titles._visible = false;
    this.gameover = false;
    this.score = 0;
    this._phase = "title";
  }

  // -------------------------------------------------------------------------
  // clearbetweenlevels() — Snowcraft1Rewrite.as:434-443.
  // -------------------------------------------------------------------------
  clearbetweenlevels(): void {
    for (const d of this.adudies) d.destroy();
    this.adudies = [];
  }

  // -------------------------------------------------------------------------
  // dolevel(level) — Snowcraft1Rewrite.as:228-283.
  // -------------------------------------------------------------------------
  dolevel(level: number): void {
    this.clearbetweenlevels();
    this.lev = level;

    if (level === 1) {
      // Snowcraft1Rewrite.as:232-235
      this.titles?.gotoAndPlay?.("seasonsgreetings");
    } else {
      // Snowcraft1Rewrite.as:236-240
      if (this.titles) this.titles.lev = level;
      this.titles?.gotoAndPlay?.("levelx");
    }

    // 3 reds at fixed anchors, walking in from (+200, +100) — :242-259.
    const redAnchors: [number, number][] = [
      [this.reddudie1startx, this.reddudie1starty],
      [this.reddudie2startx, this.reddudie2starty],
      [this.reddudie3startx, this.reddudie3starty],
    ];
    for (const [ax, ay] of redAnchors) {
      const r = this._redFactory(this.stage, this.sounds);
      r.addEventListener("throwball", this);
      this.adudies.push(r);
      r.setwalkendx(ax);
      r.setwalkendy(ay);
      r.setposition(ax + 200, ay + 100);
    }

    // N greens per level table — :261-282.
    const entries = this.greendudiestartingpoints[level - 1] ?? [];
    for (const e of entries) {
      const g = this._greenFactory(this.stage, this.sounds, this.titles);
      this.adudies.push(g);
      g.addEventListener("throwball", this);
      g.setposition(e[0], e[1]);
      g.setwalkendx(e[2]);
      g.setwalkendy(e[3]);
      // Per-level walkspeed override — :273-280.
      if (level === 5 || level > 6) g.setwalkspeed(10);
      if (level === 6) g.setwalkspeed(15);
      // Extended campaign (levels 10..14): gentle speed ramp 11..15.
      if (level >= 10) g.setwalkspeed(Math.min(10 + (level - 9), 16));
    }

    this._phase = "playing";
  }

  // -------------------------------------------------------------------------
  // throwball(eventObject) — Snowcraft1Rewrite.as:284-288.
  // -------------------------------------------------------------------------
  throwball(eventObject: { team: Team; force: number; x: number; y: number; ineffective?: boolean }): void {
    const ball = this._snowballFactory(
      this.stage,
      this.sounds,
      eventObject.team,
      eventObject.force,
      eventObject.x,
      eventObject.y,
      !!eventObject.ineffective
    );
    this.snowballs.push(ball);
  }

  // -------------------------------------------------------------------------
  // frameloop() — Snowcraft1Rewrite.as:289-409. Driven by floop.onEnterFrame
  // at 20 fps; one tick of the entire world.
  // -------------------------------------------------------------------------
  frameloop(): void {
    // (1) Win check — :291-317.
    let allGreensDead = true;
    for (const d of this.adudies) {
      if (d.team === "green" && !d.dead) {
        allGreensDead = false;
        break;
      }
    }
    if (allGreensDead && !this.gameover) {
      if (this.lev === this.greendudiestartingpoints.length) {
        // :309-311 — last level cleared → win.
        this._phase = "level-clear";
        this.ongameover(true);
        return;
      } else {
        // :313-316 — advance to next level.
        this._phase = "next";
        this.dolevel((this.lev ?? 0) + 1);
        // After dolevel, _phase is set back to "playing" — fall through to tick this frame.
      }
    }

    // (2) Lose check — :318-353.
    let allRedsDead = true;
    for (const d of this.adudies) {
      if (d.team === "red" && !d.dead) {
        allRedsDead = false;
        break;
      }
    }
    if (allRedsDead && !this.gameover) {
      // Only run the lose handler if there ARE reds in the game (otherwise an
      // "empty roster" trivially satisfies allRedsDead). Mirrors the AS where
      // dolevel always pushes 3 reds before greens, so the loop above always
      // sees at least one red unless one died. Keep the literal AS check, but
      // guard against the just-spawned/empty case.
      const anyRed = this.adudies.some((d) => d.team === "red");
      if (anyRed) {
        for (const d of this.adudies) {
          if (d.team === "green" && !d.dead) {
            (d as GreenDudie).gameover();
          }
        }
        this.ongameover(false);
        return;
      }
    }

    // (3) Snowball collisions + cleanup — :354-393.
    const toRemove: number[] = [];
    for (let i = 0; i < this.snowballs.length; i++) {
      const b = this.snowballs[i];
      for (const d of this.adudies) {
        if (d.team === "green") {
          if (
            b.team === "red" &&
            Math.abs(b.ballmc._x - d.dudiemc._x) < 30 &&
            Math.abs(b.ballmc._y - (d.dudiemc._y - 20)) < 30 &&
            !d.dead &&
            !(d as GreenDudie).down &&
            !b.dead &&
            !b.ineffective
          ) {
            // :366-371
            b.dead = true;
            this.score += 10;
            d.yougothit();
          }
        } else if (d.team === "red") {
          if (
            b.team === "green" &&
            Math.abs(b.ballmc._x - d.dudiemc._x) < 30 &&
            Math.abs(b.ballmc._y - (d.dudiemc._y - 20)) < 30 &&
            !d.dead &&
            !b.dead &&
            !b.ineffective
          ) {
            // :376-380
            b.dead = true;
            d.yougothit();
          }
        }
      }
      if (Math.abs(b.ballmc._x) > 2999 || Math.abs(b.ballmc._y) > 2999 || b.dead) {
        toRemove.push(i);
      } else {
        b.frameloop();
      }
    }

    // (4) Tick all dudies — :394-401.
    for (const d of this.adudies) d.frameloop();

    // (5) Destroy dead snowballs — :402-408.
    // The original splices in ascending order, which is buggy if there are >1
    // removals (later indices shift). We mirror that exactly to stay faithful
    // (in practice it rarely matters because at most one ball dies per tick).
    for (const idx of toRemove) {
      this.snowballs[idx]?.destroy();
      this.snowballs.splice(idx, 1);
    }
  }

  // -------------------------------------------------------------------------
  // ongameover(win) — Snowcraft1Rewrite.as:410-433. Overrides AGame.ongameover.
  // -------------------------------------------------------------------------
  ongameover(win?: boolean): void {
    const now = new Date();
    const elapsed = now.getTime() - this.starttime.getTime();
    if (win) {
      // :414-420 — time bonus.
      if (elapsed < 1_800_000) {
        this.score += Math.round((1_800_000 - elapsed) / 1000);
      }
    }
    this.gameover = true;
    if (this.titles) this.titles.score = this.score;
    if (win) {
      this.titles?.gotoAndPlay?.("gameoverwin");
    } else {
      this.titles?.gotoAndPlay?.("gameoverlose");
    }
    this._phase = "game-over";
    this.dispatchEvent({ target: this, type: "gameover" });
  }
}
