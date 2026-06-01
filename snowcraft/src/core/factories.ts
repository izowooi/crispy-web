// factories.ts — wires the real Player / AI / Snowball ports into the
// `RedDudie`, `GreenDudie`, `SnowBallLike` shapes that Game expects.
//
// Why this module exists
// ----------------------
// Game.ts ships in-file *default* factories whose `frameloop()` is a no-op,
// because the entity classes were ported in parallel and the wiring step was
// missing from the original boot path. Without this module, reds spawn at
// (walkend+200, walkend+100) — off-stage — and never walk in, and greens
// spawn at the AS table coords (often negative for level 1) and never march
// toward their walkend either. The screen looks blank after Start.
//
// This module gives Game the same external surface (RedDudie, GreenDudie,
// SnowBallLike from Game.ts) but delegates frameloop / yougothit / etc. to the
// faithfully-ported entity classes:
//   - Player.ts (RedSnowDudie + ASnowDudie)
//   - AI.ts     (GreenSnowDudie + ASnowDudie, functional API: tickGreen, etc.)
//   - Snowball.ts (SnowBall)
//
// All numeric constants come from the entity files; this module is pure glue.

import type {
  RedDudie,
  GreenDudie,
  SnowBallLike,
  Team,
} from "./Game.ts";
import { Player } from "./Player.ts";
import {
  createGreenAI,
  greenYouGotHit,
  tickGreen,
  type GreenAI,
  type ThrowEvent as GreenThrowEvent,
  type TickContext,
} from "./AI.ts";
import { Snowball, type SoundsLike } from "./Snowball.ts";

// ---------------------------------------------------------------------------
// Stage / mouse adapter — we read live mouse coords off the `stage` shim that
// main.ts passes into Game (it owns `_xmouse` / `_ymouse`, mirroring AS
// `_root.stage._xmouse / _ymouse`). Player.frameloop()'s drag teleport reads
// these (RedSnowDudie.as:175-182).
// ---------------------------------------------------------------------------

interface StageLike {
  _xmouse: number;
  _ymouse: number;
}

// ---------------------------------------------------------------------------
// Red dudie wrapper
// ---------------------------------------------------------------------------

export interface RedFactoryDeps {
  /** Random source for the kids1..3 KO cue. Defaults to `Math.random`. */
  rand?: () => number;
}

export function makeRedFactory(
  deps: RedFactoryDeps = {},
): (stage: any, sounds: any) => RedDudie {
  const rand = deps.rand ?? Math.random;
  return function redFactory(stage: any, sounds: any): RedDudie {
    const player = new Player();
    const stageRef = stage as StageLike | null | undefined;
    const soundsRef = sounds as SoundsLike | null | undefined;

    // dudiemc proxy — Game.frameloop hit-detection reads dudiemc._x/_y, and
    // main.ts mirrors x/y onto it during drag. We back the proxy onto the
    // player itself so reads are always live and writes propagate to player.x/y.
    const dudiemc = {
      get _x() {
        return player.x;
      },
      set _x(v: number) {
        player.x = v;
      },
      get _y() {
        return player.y;
      },
      set _y(v: number) {
        player.y = v;
      },
    };

    const wrapper: RedDudie = {
      team: "red",
      // x/y/walkend* are exposed as live-getters/setters onto the player.
      get x() {
        return player.x;
      },
      set x(v: number) {
        player.x = v;
      },
      get y() {
        return player.y;
      },
      set y(v: number) {
        player.y = v;
      },
      get walkendx() {
        return player.walkendx;
      },
      set walkendx(v: number) {
        player.walkendx = v;
      },
      get walkendy() {
        return player.walkendy;
      },
      set walkendy(v: number) {
        player.walkendy = v;
      },
      get walkspeed() {
        return player.walkspeed;
      },
      set walkspeed(v: number) {
        player.walkspeed = v;
      },
      get hitpoints() {
        return player.hitpoints;
      },
      set hitpoints(v: number) {
        player.hitpoints = v;
      },
      get dazed() {
        return player.dazed;
      },
      set dazed(v: number) {
        player.dazed = v;
      },
      get dead() {
        return player.dead;
      },
      set dead(v: boolean) {
        player.dead = v;
      },
      get walking() {
        return player.walking;
      },
      set walking(v: boolean) {
        player.walking = v;
      },
      dudiemc: dudiemc as unknown as { _x: number; _y: number },

      setposition(x: number, y: number) {
        player.setposition(x, y);
      },
      setwalkendx(x: number) {
        player.setwalkendx(x);
      },
      setwalkendy(y: number) {
        player.setwalkendy(y);
      },
      setwalkspeed(s: number) {
        player.setwalkspeed(s);
      },
      yougothit() {
        const before = player.hitpoints;
        player.yougothit();
        if (before > 1 && player.hitpoints === 1) {
          soundsRef?.gotoAndPlay?.("hit1");
          soundsRef?.gotoAndPlay?.("birds");
        } else if (before > 0 && player.hitpoints === 0) {
          soundsRef?.gotoAndPlay?.("kids" + Math.ceil(rand() * 3));
        }
      },
      frameloop() {
        // Pass live mouse coords for drag teleport. When the player is not
        // dragging, Player.frameloop ignores them.
        const mouse = stageRef
          ? { mouseX: stageRef._xmouse, mouseY: stageRef._ymouse }
          : undefined;
        player.frameloop(mouse);
      },
      destroy() {
        // Player has no explicit destroy; the wrapper is dropped from
        // adudies[] and that's enough for GC.
      },
      addEventListener(type: string, listener: any) {
        // Game subscribes to "throwball" on the wrapper; forward to player.
        // The event payload's `target` will be the underlying Player, which
        // is an internal detail Game does not depend on.
        player.addEventListener(type, listener);
      },
    };
    return wrapper;
  };
}

// ---------------------------------------------------------------------------
// Green dudie wrapper
// ---------------------------------------------------------------------------

export interface GreenFactoryDeps {
  /** Whether the level title overlay is currently visible
   *  (`titles._visible` in AS / `TickContext.titlesVisible`). */
  titlesVisible: () => boolean;
  /** Random source. Defaults to `Math.random`. Overridable for deterministic
   *  unit tests. */
  rand?: () => number;
}

export function makeGreenFactory(
  deps: GreenFactoryDeps,
): (stage: any, sounds: any, titles: any) => GreenDudie {
  const rand = deps.rand ?? Math.random;
  return function greenFactory(_stage: any, sounds: any, _titles: any): GreenDudie {
    const ai: GreenAI = createGreenAI({ x: 0, y: 0 });
    // A listener can be either a function (`fn(ev)`) or an object with a
    // method named after the event type (`obj[type](ev)`), per the AS
    // mx.events.EventDispatcher contract. Game.dolevel registers itself
    // (an object) on "throwball" — see dispatch() below.
    type Listener = ((ev: any) => void) | { [key: string]: any };
    const listeners = new Map<string, Listener[]>();

    // Dispatch matches the AS EventDispatcher contract (mx.events.EventDispatcher):
    // a listener may be a function (called directly) or an object whose method
    // named after the event type is invoked. Game.dolevel() registers itself
    // (an object) via `addEventListener("throwball", this)` — without the
    // object branch the green AI's throwball event is dropped before it
    // reaches Game.throwball() and no green snowball is ever spawned.
    // See Game.dispatchEvent (Game.ts:527-535) for the equivalent semantics.
    const dispatch = (type: string, ev: any) => {
      const arr = listeners.get(type);
      if (!arr) return;
      for (const l of arr.slice()) {
        if (typeof l === "function") {
          l(ev);
        } else if (l && typeof l[type] === "function") {
          l[type](ev);
        }
      }
    };

    const dudiemc = {
      get _x() {
        return ai.x;
      },
      set _x(v: number) {
        ai.x = v;
      },
      get _y() {
        return ai.y;
      },
      set _y(v: number) {
        ai.y = v;
      },
    };

    // Per-tick context for tickGreen. Sounds is the runtime SFX shim — we
    // only need .gotoAndPlay forwarding for "step" / "hit1" / etc.
    const soundsRef = sounds as SoundsLike | null | undefined;
    const tickCtx: TickContext = {
      get titlesVisible() {
        return deps.titlesVisible();
      },
      // The AS gates the "step" SFX on `_root.sounds._currentframe == 1`
      // (RedSnowDudie.as:148 / ASnowDudie). Crucially, ALL dudies share the
      // SINGLE `_root.sounds` clip (Snowcraft1Rewrite passes `this.sounds` to
      // every dudie), so only one footstep plays at a time and a new step only
      // fires once the previous step segment (~0.57 s) has finished. Reading
      // the live shared channel here reproduces that: a hard-coded `1` made
      // every green play "step" every tick (~100 overlapping plays/sec — the
      // "too loud" bug the user reported). The Sfx `_currentframe` getter
      // returns 1 when idle and 2 while a cue is playing.
      get soundsCurrentFrame() {
        // The runtime Sfx exposes `_currentframe` (1 = idle, 2 = a cue is
        // playing); Snowball's SoundsLike type doesn't declare it, so read it
        // defensively. Falls back to 1 (always-step) for shims without it.
        return (
          (soundsRef as { _currentframe?: number } | null | undefined)
            ?._currentframe ?? 1
        );
      },
      rand,
      onPose: () => {
        // Animation pose is a renderer concern; the renderer reads ai state
        // (walking / down / dead) directly. No-op here.
      },
      onPlaySound: (label: string) => {
        soundsRef?.gotoAndPlay?.(label);
      },
      onThrow: (e: GreenThrowEvent) => {
        // Game.throwball expects {team, force, x, y, ineffective?} and
        // listens for the "throwball" event on the wrapper.
        dispatch("throwball", {
          target: wrapper,
          type: "throwball",
          team: e.team,
          force: e.force,
          x: e.x,
          y: e.y,
        });
      },
    };

    const wrapper: GreenDudie = {
      team: "green",
      get x() {
        return ai.x;
      },
      set x(v: number) {
        ai.x = v;
      },
      get y() {
        return ai.y;
      },
      set y(v: number) {
        ai.y = v;
      },
      get walkendx() {
        return ai.walkendx;
      },
      set walkendx(v: number) {
        ai.walkendx = v;
      },
      get walkendy() {
        return ai.walkendy;
      },
      set walkendy(v: number) {
        ai.walkendy = v;
      },
      get walkspeed() {
        return ai.walkspeed;
      },
      set walkspeed(v: number) {
        ai.walkspeed = v;
      },
      get hitpoints() {
        return ai.hitpoints;
      },
      set hitpoints(v: number) {
        ai.hitpoints = v;
      },
      get balling() {
        return ai.balling;
      },
      set balling(v: number) {
        ai.balling = v;
      },
      get cocking() {
        return ai.cocking;
      },
      set cocking(v: number) {
        ai.cocking = v;
      },
      get down() {
        return ai.down;
      },
      set down(v: boolean) {
        ai.down = v;
      },
      get downRecoveryFrames() {
        return ai.downRecoveryFrames;
      },
      set downRecoveryFrames(v: number) {
        ai.downRecoveryFrames = v;
      },
      get dead() {
        return ai.dead;
      },
      set dead(v: boolean) {
        ai.dead = v;
      },
      get walking() {
        return ai.walking;
      },
      set walking(v: boolean) {
        ai.walking = v;
      },
      get justhit() {
        return ai.justhit;
      },
      set justhit(v: boolean) {
        ai.justhit = v;
      },
      dudiemc: dudiemc as unknown as { _x: number; _y: number },

      setposition(x: number, y: number) {
        ai.x = x;
        ai.y = y;
      },
      setwalkendx(x: number) {
        ai.walkendx = x;
      },
      setwalkendy(y: number) {
        ai.walkendy = y;
      },
      setwalkspeed(s: number) {
        ai.walkspeed = s;
      },
      yougothit() {
        greenYouGotHit(ai, {
          rand,
          onPose: () => {},
          onPlaySound: (label: string) => {
            soundsRef?.gotoAndPlay?.(label);
          },
        });
      },
      gameover() {
        // GreenSnowDudie.as:71 — taunt. SFX label not modeled; renderer/AI
        // does not need this for visibility.
      },
      frameloop() {
        tickGreen(ai, tickCtx);
      },
      destroy() {},
      addEventListener(type: string, listener: any) {
        const arr = listeners.get(type) ?? [];
        arr.push(listener);
        listeners.set(type, arr);
      },
    };
    return wrapper;
  };
}

// ---------------------------------------------------------------------------
// Snowball factory
// ---------------------------------------------------------------------------

export function snowballFactory(
  _stage: any,
  sounds: any,
  team: Team,
  force: number,
  x: number,
  y: number,
  ineffective: boolean,
): SnowBallLike {
  const soundsLike: SoundsLike = sounds && typeof sounds.gotoAndPlay === "function"
    ? sounds
    : { gotoAndPlay: () => {} };
  const ball = new Snowball({
    sounds: soundsLike,
    team,
    force,
    x,
    y,
    ineffective,
  });

  // Game.frameloop reads ballmc._x/_y/_visible and shadowmc._x/_y as plain
  // numbers; the Snowball class stores them on x/y/visible MovieClipLike
  // fields. Bridge the two with live getters.
  const ballmc = {
    get _x() {
      return ball.ballmc.x;
    },
    set _x(v: number) {
      ball.ballmc.x = v;
    },
    get _y() {
      return ball.ballmc.y;
    },
    set _y(v: number) {
      ball.ballmc.y = v;
    },
    get _visible() {
      return ball.ballmc.visible;
    },
    set _visible(v: boolean) {
      ball.ballmc.visible = v;
    },
  };
  const shadowmc = {
    get _x() {
      return ball.shadowmc.x;
    },
    set _x(v: number) {
      ball.shadowmc.x = v;
    },
    get _y() {
      return ball.shadowmc.y;
    },
    set _y(v: number) {
      ball.shadowmc.y = v;
    },
  };

  const wrapper: SnowBallLike = {
    team,
    get force() {
      return ball.force;
    },
    set force(v: number) {
      ball.force = v;
    },
    get ineffective() {
      return ball.ineffective;
    },
    set ineffective(v: boolean) {
      ball.ineffective = v;
    },
    get dead() {
      return ball.dead;
    },
    set dead(v: boolean) {
      ball.dead = v;
    },
    ballmc: ballmc as unknown as { _x: number; _y: number; _visible: boolean },
    shadowmc: shadowmc as unknown as { _x: number; _y: number },
    get xmov() {
      return ball.xmov;
    },
    set xmov(v: number) {
      ball.xmov = v;
    },
    get ymov() {
      return ball.ymov;
    },
    set ymov(v: number) {
      ball.ymov = v;
    },
    frameloop() {
      ball.frameloop();
    },
    destroy() {
      ball.destroy();
    },
  };
  return wrapper;
}
