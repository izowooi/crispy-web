// Faithful TypeScript port of the Red Snow Dudie player class
// (with the inherited ASnowDudie movement / line-clipping core).
//
// Sources (all paths under decompiled/scripts/scripts/__Packages/com/iconnicholson/onehammer/):
//   - ASnowDudie.as  (base class — walkspeed/walking/checkline/setters)
//   - RedSnowDudie.as (player-specific — hitpoints/dazed/throwball/drag)
//
// Kept faithful: numbers, formulas, and state-transition order match the AS2
// 1:1. Flash MovieClip plumbing (depth swap, attachMovie, gotoAndPlay) is
// intentionally NOT modeled; instead we expose the same logical fields the
// renderer / event consumer needs (e.g. dudiemcDazed, meterFrame).

export type ThrowBallEvent = {
  target: Player;
  type: "throwball";
  team: "red";
  force: number;
  x: number;
  y: number;
  ineffective: boolean;
};

export type ChosenEvent = {
  target: Player;
  type: "chosen";
};

export type PlayerEvent = ThrowBallEvent | ChosenEvent;

type Listener = (ev: any) => void;

/**
 * checkline — port of `ASnowDudie.checkline` (ASnowDudie.as:47-67).
 *
 * Clamps the point (x, y) against the infinite line through (x1,y1)-(x2,y2):
 *   m         = (y2 - y1) / (x2 - x1)
 *   x_on_line = (y - y1) / m + x1
 * If `less` is truthy, force x >= x_on_line. Otherwise, force x <= x_on_line.
 *
 * The original AS computes a stray local `_loc7_` that is never used; we omit
 * it. The return value is `[x, y]` (a 2-element Array in AS).
 */
export function checkline(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x: number,
  y: number,
  less: number | boolean,
): [number, number] {
  // ASnowDudie.as:49
  const m = (y2 - y1) / (x2 - x1);
  // ASnowDudie.as:51
  const xOnLine = (y - y1) / m + x1;
  if (less) {
    // ASnowDudie.as:52-58
    if (x < xOnLine) x = xOnLine;
  } else {
    // ASnowDudie.as:59-62
    if (x > xOnLine) x = xOnLine;
  }
  return [x, y];
}

export class Player {
  // ASnowDudie.as:8-11 (inherited base defaults)
  didfirstwalk = false;
  dead = false;
  walking = false;
  walkspeed = 5;

  // RedSnowDudie.as:13-17
  hitpoints = 2;
  dazed = 0;
  adobesucksmouseisdownflag = false;
  dragdudie = false;
  // (olddepth = 0 in AS — depth bookkeeping not modeled here.)

  // RedSnowDudie.as:28
  team: "red" = "red";

  // Position fields. In AS these live on `dudiemc._x` / `dudiemc._y`; we
  // collapse them onto the Player itself for the port.
  x = 0;
  y = 0;

  // Walk target / per-tick velocity (ASnowDudie/RedSnowDudie shared math).
  walkendx = 0;
  walkendy = 0;
  walkxmov = 0;
  walkymov = 0;

  // The reddudie sprite has a child `dudiemc.dazed` boolean toggled by
  // RedSnowDudie.as:75 (true on first hit) and :170 (false when dazed expires).
  // We keep the same flag name (sans the `dudiemc.` prefix) for clarity.
  dudiemcDazed = false;

  // The power meter is a child movieclip on the reddudie sprite; the AS reads
  // its `_currentframe` (RedSnowDudie.as:111-114). The port exposes the frame
  // number directly so tests / the renderer can drive it.
  meterFrame = 0;

  // EventDispatcher emulation — RedSnowDudie.as:31 / :61-62 / :116-117.
  private listeners: Map<string, Listener[]> = new Map();

  addEventListener(type: string, fn: Listener): void {
    const arr = this.listeners.get(type) ?? [];
    arr.push(fn);
    this.listeners.set(type, arr);
  }

  removeEventListener(type: string, fn: Listener): void {
    const arr = this.listeners.get(type);
    if (!arr) return;
    const i = arr.indexOf(fn);
    if (i >= 0) arr.splice(i, 1);
  }

  dispatchEvent(ev: { type: string; [k: string]: unknown }): void {
    const arr = this.listeners.get(ev.type);
    if (!arr) return;
    for (const fn of arr.slice()) fn(ev);
  }

  // ASnowDudie.as:18-29
  setwalkendx(n: number): void {
    this.walkendx = n;
  }
  setwalkendy(n: number): void {
    this.walkendy = n;
  }
  setwalkspeed(i: number): void {
    this.walkspeed = i;
  }

  // ASnowDudie.as:42-46
  setposition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  // ASnowDudie.as:47-67 — instance method delegating to the standalone
  // function; mirrors the AS API (`this.checkline(...)`).
  checkline(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x: number,
    y: number,
    less: number | boolean,
  ): [number, number] {
    return checkline(x1, y1, x2, y2, x, y, less);
  }

  /**
   * onchosen — RedSnowDudie.as:49-65.
   * Mouse-press handler on the player sprite.
   */
  onchosen(): void {
    // RedSnowDudie.as:51-54
    if (this.dudiemcDazed || this.dead || this.walking) return;
    // RedSnowDudie.as:55
    this.adobesucksmouseisdownflag = true;
    // (Depth-swap logic at :56-60 not modeled.)
    // RedSnowDudie.as:61-62
    this.dispatchEvent({ target: this, type: "chosen" });
    // RedSnowDudie.as:63
    this.dragdudie = true;
    // RedSnowDudie.as:64 — `gotoAndPlay("cock")` on the dudie clip; the
    // renderer is responsible for translating the state to the animation.
  }

  /**
   * mouseover — RedSnowDudie.as:91-98.
   * Returns true when the selection ring should be visible.
   */
  mouseover(): boolean {
    if (this.dudiemcDazed || this.dead || this.walking) return false;
    return true;
  }

  /**
   * mouserollout — RedSnowDudie.as:99-107.
   */
  mouserollout(): void {
    // RedSnowDudie.as:101 hides the selection circle (renderer concern).
    if (this.dudiemcDazed || this.dead || this.walking) return;
    // RedSnowDudie.as:106 — gotoAndStop("ready"); renderer concern.
  }

  /**
   * throwball — RedSnowDudie.as:108-118.
   * Computes force from the meter sprite frame and dispatches the throwball
   * event for the game controller (Snowcraft1Rewrite.throwball) to spawn a
   * SnowBall.
   */
  throwball(): void {
    // RedSnowDudie.as:110
    let force = 0.001;
    // RedSnowDudie.as:112-114
    if (this.meterFrame > 4) {
      force = this.meterFrame / 15;
    }
    // RedSnowDudie.as:116-117
    const ev: ThrowBallEvent = {
      target: this,
      type: "throwball",
      force,
      team: this.team,
      x: this.x,
      y: this.y - 35,
      ineffective: force < 0.1,
    };
    this.dispatchEvent(ev);
  }

  /**
   * mouserelease — RedSnowDudie.as:119-129.
   * Always clears drag flags. Throws + plays "toss" only if not dazed/dead/walking.
   */
  mouserelease(): void {
    // RedSnowDudie.as:121-122 — flags clear unconditionally.
    this.adobesucksmouseisdownflag = false;
    this.dragdudie = false;
    // RedSnowDudie.as:123-126
    if (this.dudiemcDazed || this.dead || this.walking) return;
    // RedSnowDudie.as:127
    this.throwball();
    // RedSnowDudie.as:128 — gotoAndStop("toss"); renderer concern.
  }

  /**
   * yougothit — RedSnowDudie.as:66-90.
   */
  yougothit(): void {
    // RedSnowDudie.as:68-70
    this.dragdudie = false;
    this.adobesucksmouseisdownflag = false;
    // (selectioncircle._visible = false — renderer concern.)
    // RedSnowDudie.as:71
    this.hitpoints = this.hitpoints - 1;
    // RedSnowDudie.as:72-79
    if (this.hitpoints === 1) {
      this.dazed = 40;
      this.dudiemcDazed = true;
      // gotoAndPlay("hitdazed"), sounds.gotoAndPlay("hit1"), sounds.gotoAndPlay("birds") — renderer/audio.
    }
    // RedSnowDudie.as:81-89
    if (this.hitpoints === 0) {
      this.dead = true;
      // depth swap + gotoAndPlay("dead") + random kids1/2/3 SFX — renderer/audio.
    }
  }

  /**
   * frameloop — RedSnowDudie.as:130-183.
   *
   * The optional `mouse` arg substitutes for `stage._xmouse` / `stage._ymouse`
   * (RedSnowDudie.as:177-178) which we cannot read in a faithful port without
   * a real Flash stage. Passing `undefined` (default) leaves the position
   * untouched on drag, so non-drag tests don't have to provide it.
   */
  frameloop(mouse?: { mouseX: number; mouseY: number }): void {
    // RedSnowDudie.as:132-134
    if (this.dead) return;
    // RedSnowDudie.as:136-153
    if (this.walking) {
      if (
        Math.abs(this.x - this.walkendx) < 10 &&
        Math.abs(this.y - this.walkendy) < 10
      ) {
        this.walking = false;
        // RedSnowDudie.as:141 — `walkendx = walkendy = 0`.
        this.walkendx = 0;
        this.walkendy = 0;
        // gotoAndStop("ready") — renderer concern.
      } else {
        this.x += this.walkxmov;
        this.y += this.walkymov;
        // step SFX trigger — audio concern.
      }
      return;
    }
    // RedSnowDudie.as:156-163 — walk-start branch (truthy walkendx).
    if (this.walkendx) {
      this.walking = true;
      const dx = this.walkendx - this.x;
      const dy = this.walkendy - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      this.walkxmov = dx / (dist / this.walkspeed);
      this.walkymov = dy / (dist / this.walkspeed);
      // gotoAndPlay("walk") — renderer concern.
      return;
    }
    // RedSnowDudie.as:165-172 — dazed countdown.
    if (this.dazed) {
      this.dazed = this.dazed - 1;
      if (this.dazed === 0) {
        this.dudiemcDazed = false;
        // gotoAndStop("ready") — renderer concern.
      }
    }
    // RedSnowDudie.as:175-182 — drag teleport + line clip.
    if (this.adobesucksmouseisdownflag && this.dragdudie && mouse) {
      this.x = mouse.mouseX;
      this.y = mouse.mouseY;
      const clipped = this.checkline(592, 0, 0, 320, this.x, this.y, 1);
      this.x = clipped[0];
      this.y = clipped[1];
    }
  }
}
