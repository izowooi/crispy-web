// Green CPU AI — faithful port of GreenSnowDudie.frameloop().
//
// Source of truth:
//   decompiled/scripts/scripts/__Packages/com/iconnicholson/onehammer/GreenSnowDudie.as
//   decompiled/scripts/scripts/__Packages/com/iconnicholson/onehammer/ASnowDudie.as
//   spec/ai.md  (cited inline)
//
// Design notes for the port
// -------------------------
// The original AS frameloop reads/writes movieclip-side state
// (`dudiemc._x/_y`, `dudiemc.justhit`, `dudiemc.down`, `sounds._currentframe`,
// `titles._visible`) and dispatches events. Web port keeps that contract by:
//
//  * inlining x/y onto the GreenAI struct (mirrors `dudiemc._x/_y`),
//  * exposing `justhit`/`down` as plain booleans while modelling the sprite
//    timeline clears that release each flag back into gameplay,
//  * passing a per-tick `TickContext` carrying transient inputs
//    (`titlesVisible`, `soundsCurrentFrame`) and the side-effect callbacks
//    (`onPose`, `onPlaySound`, `onThrow`),
//  * threading a deterministic `rand: () => number` through the cascade so
//    tests can replay exact RNG sequences.
//
// All numeric constants below are taken verbatim from the AS source — no
// "balanced" tweaks. Line citations track the original file.

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default `walkspeed` inherited from ASnowDudie (`ASnowDudie.as:11`). */
export const DEFAULT_WALKSPEED = 5;

/** Slow march speed assigned on arrival while the title overlay is up
 *  (`GreenSnowDudie.as:100`). */
export const TITLE_MARCH_WALKSPEED = 3;

/** Arrival threshold (`GreenSnowDudie.as:95`). |dx|<10 AND |dy|<10. */
export const ARRIVAL_THRESHOLD = 10;

/** Green starting HP (`GreenSnowDudie.as:15`). */
export const GREEN_HP = 3;

/** Stagger frames after first hit (`GreenSnowDudie.as:47`). */
export const ADOBE_FROZEN_FRAME_BUGFIX_FRAMES = 50;

/** Down + recovery span after the second hit.
 *
 *  AS sets `dudiemc.down = true` and immediately returns while that movieclip
 *  flag is true (`GreenSnowDudie.as:51-56,79-83`). The green sprite then plays
 *  the "down" label (DefineSprite_69 frames 33..57) and the "midrecover"
 *  label (frames 17..31), whose frame actions clear the movieclip flag. */
export const GREEN_DOWN_RECOVERY_FRAMES = 40;

/** Y origin offset for green throws (`GreenSnowDudie.as:163`: `y - 15`). */
export const GREEN_THROW_OFFSET_Y = -15;

/** Fixed snowball velocities. AI is "team-static": no aim is computed; the
 *  ball just gets these constant offsets per team
 *  (`SnowBall.as:43-52`). */
export const GREEN_BALL_VELOCITY = { x: 20, y: 10 } as const;
export const RED_BALL_VELOCITY = { x: -20, y: -10 } as const;

/** Boundary line that clips green random destinations
 *  (`GreenSnowDudie.as:32`: checkline(610,0,0,340,...,less=0)). */
export const GREEN_BOUNDARY_LINE = {
  x1: 610,
  y1: 0,
  x2: 0,
  y2: 340,
  less: 0,
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GreenAI {
  // World position (mirrors `dudiemc._x/_y`).
  x: number;
  y: number;

  // Walk state (`ASnowDudie.as:6-11`, `GreenSnowDudie.as:8-11`).
  walking: boolean;
  walkendx: number;
  walkendy: number;
  walkxmov: number;
  walkymov: number;
  walkspeed: number;

  // Combat state (`GreenSnowDudie.as:12-16`).
  balling: number;
  cocking: number;
  hitpoints: number;
  dead: boolean;
  down: boolean;
  downRecoveryFrames: number;
  justhit: boolean;
  adobefrozenframebugfix: number;

  // `team` is constant "green" (`GreenSnowDudie.as:24`).
  readonly team: "green";
}

export interface ThrowEvent {
  type: "throwball";
  force: number;
  team: "green";
  x: number;
  y: number;
}

export interface TickContext {
  /** Whether the level title overlay is currently visible. Sourced from
   *  `titles._visible` in the AS code (`GreenSnowDudie.as:98,144`). */
  titlesVisible: boolean;
  /** `_root.sounds._currentframe`. AS reads this to gate the step sound
   *  (`GreenSnowDudie.as:110`). 1 means idle. */
  soundsCurrentFrame: number;
  /** Deterministic random number generator. Each call returns [0,1). */
  rand: () => number;
  /** Animation pose change ("walk", "balling", "cock", "toss"). Mirrors the
   *  AS `dudiemc.gotoAndStop/gotoAndPlay` calls. */
  onPose: (label: string) => void;
  /** Sound trigger ("step", etc.). Mirrors `sounds.gotoAndPlay`. */
  onPlaySound: (label: string) => void;
  /** Snowball spawn dispatch (mirrors AS `dispatchEvent({type:'throwball',...})`). */
  onThrow: (e: ThrowEvent) => void;
}

export interface YouGotHitContext {
  rand: () => number;
  onPose: (label: string) => void;
  onPlaySound: (label: string) => void;
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

export function createGreenAI(pos: { x: number; y: number }): GreenAI {
  return {
    x: pos.x,
    y: pos.y,
    walking: false,
    walkendx: 0,
    walkendy: 0,
    walkxmov: 0,
    walkymov: 0,
    walkspeed: DEFAULT_WALKSPEED,
    balling: 0,
    cocking: 0,
    hitpoints: GREEN_HP,
    dead: false,
    down: false,
    downRecoveryFrames: 0,
    justhit: false,
    adobefrozenframebugfix: 0,
    team: "green",
  };
}

// ---------------------------------------------------------------------------
// Boundary clip primitive — verbatim port of ASnowDudie.checkline (lines 47-67)
// ---------------------------------------------------------------------------
//
// AS source:
//   var _loc3_ = (y2 - y1) / (x2 - x1);
//   var _loc1_ = (y - y1) / _loc3_ + x1;
//   if (less)  { if (x < _loc1_) x = _loc1_; }
//   else        { if (x > _loc1_) x = _loc1_; }
//   return [x, y];
//
// `_loc7_` in the AS code is computed but unused — preserved here as a
// comment for fidelity.
export function checkline(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x: number,
  y: number,
  less: 0 | 1,
): { x: number; y: number } {
  const slope = (y2 - y1) / (x2 - x1); // _loc3_
  const lineX = (y - y1) / slope + x1; // _loc1_
  if (less) {
    if (x < lineX) x = lineX;
  } else {
    if (x > lineX) x = lineX;
  }
  return { x, y };
}

// ---------------------------------------------------------------------------
// Random destination — verbatim port of GreenSnowDudie.randomdestinationwithinboundaries
// (GreenSnowDudie.as:27-36)
// ---------------------------------------------------------------------------

export function randomDestinationWithinBoundaries(
  rand: () => number,
): { x: number; y: number } {
  // AS uses two Math.random() draws (x then y). Order matters for replayable RNG.
  const rawX = rand() * 500; // _loc2_[0] — GreenSnowDudie.as:30
  const rawY = rand() * 300; // _loc2_[1] — GreenSnowDudie.as:31
  const clipped = checkline(610, 0, 0, 340, rawX, rawY, 0); // GreenSnowDudie.as:32
  return clipped;
}

// ---------------------------------------------------------------------------
// Walk-vector setup — used by branch (F) when starting a new walk
// (GreenSnowDudie.as:139-141)
// ---------------------------------------------------------------------------

export function greenStartWalk(ai: GreenAI): void {
  // distance from current pos to walkend (Math.sqrt(dy^2 + dx^2)).
  const dx = ai.walkendx - ai.x;
  const dy = ai.walkendy - ai.y;
  const dist = Math.sqrt(dy * dy + dx * dx);
  // Per-frame step magnitude == walkspeed.
  // AS:140-141 — (walkend - pos) / (dist / walkspeed). This is equivalent to
  // (walkend - pos) * walkspeed / dist, i.e. a unit vector scaled by walkspeed.
  ai.walkxmov = dx / (dist / ai.walkspeed);
  ai.walkymov = dy / (dist / ai.walkspeed);
}

// ---------------------------------------------------------------------------
// Force calculation — `0.3 + Math.random() * 0.6` (GreenSnowDudie.as:163)
// ---------------------------------------------------------------------------

export function greenThrowForce(r: number): number {
  return 0.3 + r * 0.6;
}

// ---------------------------------------------------------------------------
// yougothit — HP transitions (GreenSnowDudie.as:37-67)
// ---------------------------------------------------------------------------

export function greenYouGotHit(ai: GreenAI, ctxIn: YouGotHitContext): void {
  // AS:39-42 — clear walking/cocking/balling and timeline flags before applying damage.
  ai.walking = false;
  ai.cocking = 0;
  ai.balling = 0;
  ai.justhit = false;
  ai.down = false;
  ai.downRecoveryFrames = 0;

  ai.hitpoints = ai.hitpoints - 1; // AS:43

  if (ai.hitpoints === 2) {
    // AS:44-50
    ai.justhit = true;
    ai.adobefrozenframebugfix = ADOBE_FROZEN_FRAME_BUGFIX_FRAMES;
    ctxIn.onPose("hit");
    ctxIn.onPlaySound("hit1");
  }
  if (ai.hitpoints === 1) {
    // AS:51-56
    ai.down = true;
    ai.downRecoveryFrames = GREEN_DOWN_RECOVERY_FRAMES;
    ctxIn.onPose("down");
    ctxIn.onPlaySound("hit1");
  }
  if (ai.hitpoints === 0) {
    // AS:58-66
    ctxIn.onPose("dead");
    ai.dead = true;
    // "kids" + Math.ceil(Math.random()*3): values 1..3
    const which = Math.ceil(ctxIn.rand() * 3);
    ctxIn.onPlaySound("kids" + which);
  }
}

// ---------------------------------------------------------------------------
// throwball — payload builder (GreenSnowDudie.as:161-165)
// ---------------------------------------------------------------------------

function greenThrowBall(ai: GreenAI, ctxIn: TickContext): void {
  // AS:163: { force: 0.3+rand*0.6, team:"green", x:dudiemc._x, y:dudiemc._y - 15 }
  const force = greenThrowForce(ctxIn.rand());
  const event: ThrowEvent = {
    type: "throwball",
    force,
    team: "green",
    x: ai.x,
    y: ai.y + GREEN_THROW_OFFSET_Y,
  };
  ctxIn.onThrow(event);
}

// ---------------------------------------------------------------------------
// frameloop — strict priority cascade (GreenSnowDudie.as:73-160)
// ---------------------------------------------------------------------------

export function tickGreen(ai: GreenAI, ctxIn: TickContext): void {
  // (A) Dead — AS:75-78
  if (ai.dead) return;

  // (B) Down — AS:79-82  (dudiemc.down is the authoritative flag in AS;
  //     the local `down` is a mirror set in branch (B)/yougothit. See spec §10.)
  if (ai.down) {
    if (ai.downRecoveryFrames > 0) {
      ai.downRecoveryFrames -= 1;
    }
    if (ai.downRecoveryFrames <= 0) {
      ai.down = false;
      ai.downRecoveryFrames = 0;
    }
    return;
  }
  // AS:83 mirrors the movieclip flag back onto `this.down` once the timeline
  // has released branch (B).
  ai.down = false;

  // (C) Just-hit recovery — AS:84-92
  if (ai.justhit) {
    ai.adobefrozenframebugfix = ai.adobefrozenframebugfix - 1;
    if (ai.adobefrozenframebugfix < 0) {
      ai.justhit = false;
    }
    return;
  }

  // (D) Walking — AS:93-116
  if (ai.walking) {
    if (
      Math.abs(ai.x - ai.walkendx) < ARRIVAL_THRESHOLD &&
      Math.abs(ai.y - ai.walkendy) < ARRIVAL_THRESHOLD
    ) {
      // Arrived. Pose to "balling" then either keep marching (titles) or stop.
      ctxIn.onPose("balling"); // AS:97
      if (ctxIn.titlesVisible) {
        // AS:98-101 — title-card slow march
        ai.walkspeed = TITLE_MARCH_WALKSPEED;
        return;
      }
      ai.walking = false;
      ai.walkendx = 0;
      ai.walkendy = 0;
    } else {
      // Continue motion. AS:108-113.
      ai.x += ai.walkxmov;
      ai.y += ai.walkymov;
      if (ctxIn.soundsCurrentFrame === 1) {
        ctxIn.onPlaySound("step");
      }
    }
    return;
  }

  // (E) Cocking countdown → throw — AS:117-126
  if (ai.cocking > 0) {
    ai.cocking = ai.cocking - 1;
    if (ai.cocking === 10) {
      ctxIn.onPose("toss");
      greenThrowBall(ai, ctxIn);
    }
    return;
  }

  // (F) Random walk roll — AS:127-143
  // The dice roll consumes one rand() ALWAYS, even when walkendx is preset
  // (matches `Math.random() > 0.975 || this.walkendx`: AS evaluates the LHS
  // first, so the random call is unconditional).
  const walkRoll = ctxIn.rand();
  if (walkRoll > 0.975 || ai.walkendx) {
    ai.walking = true;
    ctxIn.onPose("walk");
    if (!ai.walkendx) {
      const dest = randomDestinationWithinBoundaries(ctxIn.rand);
      ai.walkendx = dest.x;
      ai.walkendy = dest.y;
    }
    greenStartWalk(ai);
    return;
  }

  // (G) Title-card freeze — AS:144-147
  if (ctxIn.titlesVisible) return;

  // (H) Balling countdown → cocking — AS:148-157
  if (ai.balling > 0) {
    ai.balling = ai.balling - 1;
    if (ai.balling <= 0) {
      ctxIn.onPose("cock");
      ai.cocking = 15 + Math.round(ctxIn.rand() * 30); // [15..45]
    }
    return;
  }

  // (I) Start balling — AS:158-159
  ctxIn.onPose("balling");
  ai.balling = 10 + Math.round(ctxIn.rand() * 50); // [10..60]
}
