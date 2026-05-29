// Snowball — faithful port of `class com.iconnicholson.onehammer.SnowBall`
// from `decompiled/scripts/scripts/__Packages/com/iconnicholson/onehammer/SnowBall.as`.
//
// Spec: spec/snowball.md.
//
// Notes on faithful-port discipline:
// - All time-based constants are per-frame at 20 fps. The original
//   `frameloop()` was driven by `onEnterFrame`; we expose the same method
//   and assume the host calls it once per frame.
// - Pixel-velocity values are px/frame (xmov/ymov, shadowxmov/shadowymov).
// - There is no continuous gravity. The arc emerges from per-frame ymov
//   adjustments triggered by horizontal range thresholds.
// - The shadow is placed `grounddistance = 35 px` below the ball at spawn
//   and never tracks the ball afterwards (SnowBall.as:17,42).
// - Sounds: spawn plays "longthrow" if force >= 1 else "throw"
//   (SnowBall.as:53-60). Red landing plays "splat" (SnowBall.as:84). Green
//   landing plays NO sound (SnowBall.as:108-114) — preserve as-is.

export type Team = "red" | "green";

export interface SoundsLike {
  gotoAndPlay(label: string): void;
}

export interface MovieClipLike {
  x: number;
  y: number;
  visible: boolean;
  animation: string | null;
  removed: boolean;
  gotoAndPlay(label: string): void;
  removeMovieClip(): void;
}

function makeMovieClip(): MovieClipLike {
  return {
    x: 0,
    y: 0,
    visible: true,
    animation: null,
    removed: false,
    gotoAndPlay(label: string) {
      this.animation = label;
    },
    removeMovieClip() {
      this.removed = true;
    },
  };
}

export interface SnowballOptions {
  sounds: SoundsLike;
  team: Team;
  force: number;
  x: number;
  y: number;
  ineffective?: boolean;
}

export class Snowball {
  // Field defaults from SnowBall.as:15-17
  dead = false;
  ineffective = false;
  grounddistance = 35;

  // Latched / per-instance fields from SnowBall.as:18-42
  team: Team;
  force: number;
  originalx: number;
  originaly: number;
  xmov = 0;
  ymov = 0;
  shadowxmov = 0;
  shadowymov = 0;

  ballmc: MovieClipLike;
  shadowmc: MovieClipLike;
  sounds: SoundsLike;

  constructor(opts: SnowballOptions) {
    // SnowBall.as:20-23
    this.sounds = opts.sounds;
    this.team = opts.team;
    this.force = opts.force;

    // SnowBall.as:24-27 — only set when truthy
    if (opts.ineffective) {
      this.ineffective = opts.ineffective;
    }

    // SnowBall.as:34-42 — attach + place ball/shadow
    this.shadowmc = makeMovieClip();
    this.ballmc = makeMovieClip();
    this.ballmc.x = this.originalx = opts.x;
    this.ballmc.y = this.originaly = opts.y;
    this.shadowmc.x = opts.x;
    this.shadowmc.y = opts.y + 35;

    // SnowBall.as:43-52 — initial velocity by team
    if (this.team === "red") {
      this.xmov = this.shadowxmov = -20;
      this.ymov = this.shadowymov = -10;
    } else if (this.team === "green") {
      this.xmov = this.shadowxmov = 20;
      this.ymov = this.shadowymov = 10;
    }

    // SnowBall.as:53-60 — spawn sound
    if (this.force >= 1) {
      this.sounds.gotoAndPlay("longthrow");
    } else {
      this.sounds.gotoAndPlay("throw");
    }
  }

  // SnowBall.as:62-66
  destroy(): void {
    this.ballmc.removeMovieClip();
    this.shadowmc.removeMovieClip();
  }

  // SnowBall.as:67-134
  frameloop(): void {
    // SnowBall.as:69-72
    if (this.dead) {
      return;
    }

    if (this.team === "red") {
      // SnowBall.as:75-78
      if (this.ymov > -3) {
        this.ineffective = true;
      }
      // SnowBall.as:79-86 — landing window
      if (this.ymov > -2 && this.ymov < 50) {
        this.ymov = 51;
        this.ballmc.visible = false;
        this.shadowmc.gotoAndPlay("land");
        this.sounds.gotoAndPlay("splat");
        return;
      }
      // SnowBall.as:87-94 — post-landing decay
      if (this.ymov > 50) {
        this.ymov += 1;
        if (this.ymov > 100) {
          this.dead = true;
        }
        return;
      }
      // SnowBall.as:96-100 — range-based drop trigger (signed)
      if (
        this.force !== 1 &&
        this.originalx - this.ballmc.x > this.force * 100
      ) {
        this.ymov += 3 - this.force;
        this.force -= this.force * 0.15;
      }
    } else if (this.team === "green") {
      // SnowBall.as:104-107
      if (this.ymov > 17) {
        this.ineffective = true;
      }
      // SnowBall.as:108-114 — landing window (NO splat sound for green)
      if (this.ymov > 18 && this.ymov < 50) {
        this.ymov = 51;
        this.ballmc.visible = false;
        this.shadowmc.gotoAndPlay("land");
        return;
      }
      // SnowBall.as:115-122 — post-landing decay
      if (this.ymov > 50) {
        this.ymov += 1;
        if (this.ymov > 100) {
          this.dead = true;
        }
        return;
      }
      // SnowBall.as:124-128 — range-based drop trigger (uses Math.abs)
      if (
        this.force < 1 &&
        Math.abs(this.originalx - this.ballmc.x) > this.force * 300
      ) {
        this.ymov += 2 - this.force;
        this.force -= this.force * 0.15;
      }
    }

    // SnowBall.as:130-133 — common position integration
    this.ballmc.x += this.xmov;
    this.ballmc.y += this.ymov;
    this.shadowmc.x += this.shadowxmov;
    this.shadowmc.y += this.shadowymov;
  }
}
