// Snowcraft (Faithful Port) — entry point.
//
// Boot sequence per spec/main.md §3:
//   1. Resolve <canvas id="game">.
//   2. Preload PNG sprites + audio cues from /assets/manifest.json.
//   3. Render the title/start screen (spec/levels.md §6: titles.gotoAndPlay
//      "seasonsgreetings" on entry; the user must click Start to dispatch
//      `dolevel(1)`). The Game object itself is constructed up-front so the
//      debug hook can introspect it before play begins.
//   4. On Start click: call `dolevel(1)` and drive `frameloop()` at 20 fps via
//      requestAnimationFrame.
//
// All gameplay constants come from the ported modules (core/*.ts) which cite
// the AS source for every numeric literal. Stage size is locked at 592x320.

import { Game } from "./core/Game.ts";
import type { Team } from "./core/Game.ts";
import { GAME_FPS } from "./core/levelConfig.ts";
import { Renderer } from "./render/Renderer.ts";
import { Sfx } from "./audio/Sfx.ts";
import { Input } from "./input/Input.ts";
import {
  makeRedFactory,
  makeGreenFactory,
  snowballFactory,
} from "./core/factories.ts";
import { redPose, greenPose } from "./render/pose.ts";
import { PoseClock } from "./render/PoseClock.ts";
import { frameForState } from "./render/Animation.ts";
import { chargeFrame, chargeForce, METER_MAX } from "./core/meter.ts";

const STAGE_WIDTH = Renderer.STAGE_WIDTH; // 592 — spec/main.md §2
const STAGE_HEIGHT = Renderer.STAGE_HEIGHT; // 320 — spec/main.md §2
const FRAME_INTERVAL_MS = 1000 / GAME_FPS; // 50 ms — spec/main.md §2

interface DudieView {
  team: Team;
  x: number;
  y: number;
  dead?: boolean;
  walking?: boolean;
  hitpoints: number;
  dazed?: number;
  down?: boolean;
  selected?: boolean;
  // Green-only AI fields (mirrored on the wrapper).
  justhit?: boolean;
  cocking?: number;
  balling?: number;
}

/** Number of game-frameloop ticks during which a freshly-released red dudie
 *  shows the "toss" pose before reverting to "ready". Mirrors the AS source
 *  where gotoAndStop("toss") plays the toss animation, which in the SWF index
 *  is a single frame — so a few render-ticks of dwell here is sufficient. */
const TOSS_DWELL_FRAMES = 3;

interface SnowballView {
  team: Team;
  ballmc: { _x: number; _y: number; _visible: boolean };
  shadowmc: { _x: number; _y: number };
}

// Start-button rectangle (canvas coords) — drawn on the title screen.
// Centered horizontally at y≈230 to leave the upper area for the
// "seasonsgreetings" title artwork.
const START_BTN = { x: 246, y: 220, w: 100, h: 36 };

async function boot(): Promise<void> {
  const canvas = document.getElementById("game") as HTMLCanvasElement | null;
  if (!canvas) {
    console.error("Snowcraft: <canvas id=\"game\"> not found");
    return;
  }
  canvas.width = STAGE_WIDTH;
  canvas.height = STAGE_HEIGHT;

  // Show a "Loading..." splash on the 2D context while preloading.
  const loadingCtx = canvas.getContext("2d");
  if (loadingCtx) {
    loadingCtx.fillStyle = "#CCCCCC";
    loadingCtx.fillRect(0, 0, canvas.width, canvas.height);
    loadingCtx.fillStyle = "#333";
    loadingCtx.font = "16px sans-serif";
    loadingCtx.textAlign = "center";
    loadingCtx.fillText("Loading…", canvas.width / 2, canvas.height / 2);
  }

  // Asset preload — Renderer + Sfx in parallel.
  const [renderer, sfx] = await Promise.all([
    Renderer.create(canvas),
    Sfx.create(),
  ]);

  // Game adapter — `titles` is a tiny in-memory shim that records HUD calls.
  //
  // Title-overlay timeline model (DefineSprite_110 in the SWF):
  //   - `gotoAndPlay("seasonsgreetings")` lands at frame 5 and plays through
  //     frame 73, where `gotoAndStop(1)` triggers frame_1's `_visible = false`
  //     action. That's 68 frames of visibility (~3.4s @ 20 fps).
  //   - `gotoAndPlay("levelx")` lands at frame 149 and plays through frame
  //     165 — 16 frames (~0.8s @ 20 fps).
  //   - End-of-game labels (`gameoverwin`/`gameoverlose`/`credits`) hold
  //     `_visible = true` indefinitely; the SWF pauses there.
  //
  // `tick()` is invoked once per Game.frameloop() so the countdown advances
  // in lockstep with gameplay (deterministic, framerate-independent).
  // Without this auto-clear, `titles._visible` stays true forever after
  // dolevel(1), branch (G) of GreenSnowDudie.frameloop (line 144) short-
  // circuits, and greens never throw — see observations/defect_ai-throw.md.
  const TITLE_FRAMES_SEASONSGREETINGS = 68; // DefineSprite_110 frames 5..73
  const TITLE_FRAMES_LEVELX = 16; // DefineSprite_110 frames 149..165
  const titles = {
    _visible: false,
    lev: 0,
    score: 0,
    label: "",
    framesRemaining: 0,
    gotoAndPlay(label: string) {
      this.label = label;
      if (label === "seasonsgreetings") {
        this._visible = true;
        this.framesRemaining = TITLE_FRAMES_SEASONSGREETINGS;
      } else if (label === "levelx") {
        this._visible = true;
        this.framesRemaining = TITLE_FRAMES_LEVELX;
      } else if (
        label === "gameoverwin" ||
        label === "gameoverlose" ||
        label === "credits"
      ) {
        this._visible = true;
        this.framesRemaining = 0; // hold indefinitely
      } else {
        // Empty / "1" / unknown — return to hidden state (frame 1 in the SWF).
        this._visible = false;
        this.framesRemaining = 0;
      }
    },
    /** Decrement the visibility countdown; clears `_visible` when it hits 0. */
    tick() {
      if (this.framesRemaining > 0) {
        this.framesRemaining -= 1;
        if (this.framesRemaining === 0) {
          this._visible = false;
        }
      }
    },
  };

  // The mouse-tracking stage shim is read by Player.frameloop() during drag
  // (RedSnowDudie.as:175-182). main.ts updates _xmouse/_ymouse from DOM events.
  const stage = { _xmouse: 0, _ymouse: 0 };

  const game = new Game({
    stage,
    titles,
    sounds: sfx,
    factories: {
      red: makeRedFactory(),
      green: makeGreenFactory({
        titlesVisible: () => titles._visible,
      }),
      snowball: snowballFactory,
    },
  });

  // Phase: 'title' before Start clicked, 'playing' after. Game.phase tracks
  // its own state machine; this flag gates the canvas-level Start button.
  let started = false;

  // Per-dudie animation clock + last-release timestamp. The PoseClock resets a
  // dudie's animation tick to 0 whenever its pose changes, so one-shot clips
  // (death, fall) play from their first frame and then hold the last frame
  // instead of looping (the death-frame flicker fix — PROGRESS_BEHAVIOR.md).
  // `releaseTickByDudie` records the globalAnimTick at which a red threw, so it
  // briefly shows the "toss" pose afterwards.
  const poseClock = new PoseClock();
  const releaseTickByDudie = new WeakMap<object, number>();
  // Per-dudie {pose, tick} resolved once per game tick (20 fps) and read by the
  // render pass. Computing pose at the game-tick rate (not per rAF) keeps the
  // PoseClock advancing at the SWF's fixed frame rate.
  const renderStateByDudie = new WeakMap<object, { pose: string; tick: number }>();
  /** Bumps once per game.frameloop() call. */
  let globalAnimTick = 0;

  // Input wiring — translates DOM events into Game / red-dudie calls. The
  // hit-test for "did the click land on a red dudie?" is straightforward:
  // each red sprite is anchored at (x,y) with a ~60×80 footprint
  // (spec/player.md §8). Hover handling drives the selection ring; press +
  // release drive `onchosen` / `mouserelease` on the chosen dudie's shim.
  const HIT_HALF_W = 30;
  const HIT_HALF_H = 80;

  let hovered: DudieView | null = null;
  let dragging: DudieView | null = null;
  let pressStart: number = 0;

  function pickRedAt(x: number, y: number): DudieView | null {
    // Topmost red dudie under the cursor; iterate from end to honour AS
    // depth-swap convention (last-clicked = highest, drawn last).
    for (let i = game.adudies.length - 1; i >= 0; i--) {
      const d = game.adudies[i] as DudieView;
      if (d.team !== "red" || d.dead) continue;
      if (
        x >= d.x - HIT_HALF_W &&
        x <= d.x + HIT_HALF_W &&
        y >= d.y - HIT_HALF_H &&
        y <= d.y
      ) {
        return d;
      }
    }
    return null;
  }

  function hitsStartButton(x: number, y: number): boolean {
    return (
      x >= START_BTN.x &&
      x <= START_BTN.x + START_BTN.w &&
      y >= START_BTN.y &&
      y <= START_BTN.y + START_BTN.h
    );
  }

  function startGame(): void {
    if (started) return;
    started = true;
    // Kick off level 1 (frame_5/DoAction.as:11 — `_root.game.dolevel(1)`).
    game.dolevel(1);
  }

  const input = new Input(canvas, {
    onMove(x: number, y: number) {
      // Always mirror cursor onto the stage shim so Player.frameloop's drag
      // teleport (RedSnowDudie.as:175-182) reads the live coords.
      stage._xmouse = x;
      stage._ymouse = y;
      if (!started) return;
      hovered = pickRedAt(x, y);
      if (dragging) {
        // Drag teleport — RedSnowDudie.as:175-182. Clip to checkline
        // (592,0,0,320, …, less=1) is delegated to the Player port; here we
        // mirror the in-Game shim (writes x/y + dudiemc directly).
        // For the default Game.ts shims we just write x/y; the renderer
        // reads the same fields.
        dragging.x = x;
        dragging.y = y;
        // Mirror dudiemc — Game.frameloop hit-detection reads dudiemc._x/_y.
        const mc = (dragging as unknown as { dudiemc?: { _x: number; _y: number } }).dudiemc;
        if (mc) {
          mc._x = x;
          mc._y = y;
        }
      }
    },
    onPress(x: number, y: number) {
      if (!started) {
        if (hitsStartButton(x, y)) {
          startGame();
        }
        return;
      }
      const target = pickRedAt(x, y);
      if (!target) return;
      dragging = target;
      pressStart = performance.now();
      // Mark "selected" for renderer (selection ring). Field is a port-level
      // hint; the AS source toggles selectioncircle._visible directly.
      (target as DudieView).selected = true;
    },
    onRelease() {
      if (!dragging) return;
      // Throw — spawn a snowball with a small constant force as a stand-in
      // for the meter-frame sample (RedSnowDudie.as:110-114). Without the
      // full Player port wired through `factories`, this gives the player a
      // working throw that exercises Game.throwball + the Sfx label cue.
      // Charge proportional to hold duration: 250ms ≈ frame 5, 750ms ≈ frame
      // 15. Same mapping the on-screen gauge uses (src/core/meter.ts), so the
      // thrown power matches what the player saw charging.
      const heldMs = performance.now() - pressStart;
      const meterFrame = chargeFrame(heldMs);
      const force = chargeForce(meterFrame);
      game.throwball({
        team: "red",
        force,
        x: dragging.x,
        y: dragging.y - 35, // RedSnowDudie.as:117 spawn-y offset
        ineffective: force < 0.1,
      });
      // Stamp the release tick for this dudie so the renderer shows "toss"
      // for the next few frames before reverting to "ready".
      releaseTickByDudie.set(dragging as unknown as object, globalAnimTick);
      (dragging as DudieView).selected = false;
      dragging = null;
    },
    onKeyDown(code: number) {
      game.keydown(code);
    },
    onKeyUp(code: number) {
      game.keyup(code);
    },
  });

  // ---------------------------------------------------------------------------
  // Frame loop — 20 fps, requestAnimationFrame-driven with a fixed-step
  // accumulator (spec/main.md §2: "load-bearing" 20 fps).
  // ---------------------------------------------------------------------------

  // Resolve a dudie's pose label from its logical state. Pure w.r.t. the dudie
  // plus the input-driven drag/release context; called once per game tick so
  // the PoseClock advances at the SWF frame rate. NOT dependent on hover —
  // hover only drives the selection ring, which is resolved at render time.
  function poseForDudie(d: DudieView): string {
    if (d.team === "red") {
      const meterFrame = dragging === d ? 1 : 0;
      const releaseAt = releaseTickByDudie.get(d as unknown as object);
      const justReleased =
        releaseAt !== undefined &&
        globalAnimTick - releaseAt < TOSS_DWELL_FRAMES;
      return redPose({
        dead: !!d.dead,
        dudiemcDazed: (d.dazed ?? 0) > 0,
        walking: !!d.walking,
        meterFrame,
        justReleased,
      });
    }
    return greenPose({
      dead: !!d.dead,
      down: !!d.down,
      justhit: !!d.justhit,
      walking: !!d.walking,
      cocking: d.cocking ?? 0,
      balling: d.balling ?? 0,
    });
  }

  let lastTime = performance.now();
  let acc = 0;

  function tick(now: number): void {
    const dt = now - lastTime;
    lastTime = now;
    if (started) {
      acc += dt;
      // Cap accumulator to avoid spiral-of-death after long pauses (e.g. tab
      // backgrounded). One full second of catch-up is plenty.
      if (acc > 1000) acc = FRAME_INTERVAL_MS;
      while (acc >= FRAME_INTERVAL_MS) {
        game.frameloop();
        // Drive the title-overlay countdown in lockstep with the game tick so
        // that branch (G) of GreenSnowDudie.frameloop (titles._visible gate at
        // line 144) eventually releases and greens start throwing.
        titles.tick();
        globalAnimTick += 1;
        // Resolve each live dudie's pose and advance its PoseClock once per
        // game tick. The clock resets when the pose changes, so one-shot clips
        // (death/fall) restart and then hold their last frame instead of
        // flickering. WeakMap entries for destroyed dudies are GC'd.
        for (const d of game.adudies as unknown as DudieView[]) {
          const pose = poseForDudie(d);
          const tickInPose = poseClock.advance(d as unknown as object, pose);
          renderStateByDudie.set(d as unknown as object, {
            pose,
            tick: tickInPose,
          });
        }
        acc -= FRAME_INTERVAL_MS;
      }
    }
    draw();
    requestAnimationFrame(tick);
  }

  function drawTitle(): void {
    renderer.clear();
    renderer.drawBackground();
    const ctx = renderer.ctx;
    // Title text — "Seasons Greetings" mirrors the AS frame-label
    // (spec/levels.md §6: titles.gotoAndPlay("seasonsgreetings")).
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText("SNOWCRAFT", STAGE_WIDTH / 2, 90);
    ctx.font = "16px sans-serif";
    ctx.fillText("Seasons Greetings", STAGE_WIDTH / 2, 130);
    ctx.font = "12px sans-serif";
    ctx.fillText("Click and hold a red dudie to throw snowballs.", STAGE_WIDTH / 2, 170);
    // Start button.
    ctx.fillStyle = "#2a7a2a";
    ctx.fillRect(START_BTN.x, START_BTN.y, START_BTN.w, START_BTN.h);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(START_BTN.x, START_BTN.y, START_BTN.w, START_BTN.h);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText("START", STAGE_WIDTH / 2, START_BTN.y + 24);
    ctx.restore();
  }

  function drawGameOver(): void {
    drawWorld();
    const ctx = renderer.ctx;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "bold 32px sans-serif";
    const label = (game as unknown as { titles: { label: string } }).titles.label;
    const winText = label === "gameoverwin" ? "YOU WIN!" : "GAME OVER";
    ctx.fillText(winText, STAGE_WIDTH / 2, 140);
    ctx.font = "16px sans-serif";
    ctx.fillText(`Score: ${game.score}`, STAGE_WIDTH / 2, 175);
    ctx.restore();
  }

  function drawWorld(): void {
    renderer.clear();
    renderer.drawBackground();

    // Snowballs first (under dudies feet) then dudies in adudies order.
    for (const b of game.snowballs as unknown as SnowballView[]) {
      renderer.drawSnowball({
        ballX: b.ballmc._x,
        ballY: b.ballmc._y,
        shadowX: b.shadowmc._x,
        shadowY: b.shadowmc._y,
        visible: b.ballmc._visible !== false,
      });
    }

    for (const d of game.adudies as unknown as DudieView[]) {
      // Hover/selection is resolved at RENDER time so the ring stays responsive
      // to the mouse (not quantized to the 20 fps game tick). Pose + animation
      // tick come from the PoseClock resolved in the game tick loop.
      const isHover = hovered === d || dragging === d;
      const rs = renderStateByDudie.get(d as unknown as object);
      const pose = rs?.pose ?? poseForDudie(d);
      const tick = rs?.tick ?? 0;
      renderer.drawDudie({
        team: d.team,
        x: d.x,
        y: d.y,
        dead: !!d.dead,
        dazed: (d.dazed ?? 0) > 0,
        selected: !!d.selected || (d.team === "red" && isHover),
        pose,
        tick,
      });
    }

    // Charge meter gauge — drawn over the held red dudie's head while dragging
    // (RedSnowDudie.as:108-117 / PROGRESS_BEHAVIOR.md §4). Procedural HUD, not
    // game art: the SWF meter clip is a vector overlay with no extracted PNG.
    if (dragging) {
      drawChargeMeter(dragging);
    }
  }

  /**
   * Draw the vertical green-tick charge meter beside the held red dudie's head.
   * The fill height tracks the SAME frame value used for the throw force
   * (src/core/meter.ts), so what the player sees is what they throw.
   */
  function drawChargeMeter(d: DudieView): void {
    const frame = chargeFrame(performance.now() - pressStart); // 1..METER_MAX
    const ctx = renderer.ctx;
    // Anchor to the right of the head. Foot is at (d.x, d.y); the body is
    // ~50px tall, so the head sits around d.y - 50.
    const headY = d.y - 52;
    const barX = Math.round(d.x + 14);
    const tickH = 2; // px per tick segment
    const tickGap = 1;
    const tickW = 6;
    const slotH = tickH + tickGap;
    const totalH = METER_MAX * slotH;
    ctx.save();
    // Track background.
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(barX - 1, Math.round(headY - totalH) - 1, tickW + 2, totalH + 2);
    // Filled ticks grow UPWARD from the head.
    for (let i = 0; i < frame; i++) {
      const y = Math.round(headY - (i + 1) * slotH);
      // Green low -> yellow mid -> red near full, like a power gauge.
      const t = i / (METER_MAX - 1);
      ctx.fillStyle =
        t < 0.5 ? "#3fd23f" : t < 0.8 ? "#e6d23a" : "#e6553a";
      ctx.fillRect(barX, y, tickW, tickH);
    }
    ctx.restore();
  }

  function draw(): void {
    if (!started) {
      drawTitle();
      return;
    }
    if (game.gameover) {
      drawGameOver();
      return;
    }
    drawWorld();
  }

  void input; // input is alive for the page lifetime; suppress unused warning.

  // ---------------------------------------------------------------------------
  // Debug hook — exposed on `window.__snowcraft` for E2E tests. NOT used by
  // production gameplay code; the main.ts boot path above is the contract.
  // ---------------------------------------------------------------------------
  const debug = {
    game,
    renderer,
    sfx,
    titles,
    canvas,
    isStarted: () => started,
    isReady: true,
    titleScreen: () => ({
      visible: !started,
      label: titles.label,
      button: { ...START_BTN },
    }),
    /** Programmatic Start button click for deterministic E2E flow. */
    start: () => {
      startGame();
    },
    /** Number of green/red dudies currently alive (used by E2E to assert
     *  level enemy count from spec/levels.md). */
    counts: () => {
      const greens = game.adudies.filter(
        (d) => d.team === "green" && !d.dead
      ).length;
      const reds = game.adudies.filter(
        (d) => d.team === "red" && !d.dead
      ).length;
      return { greens, reds, level: game.lev ?? 0, gameover: game.gameover };
    },
    /** Per-dudie resolved render state — used by E2E/manual checks to verify
     *  that one-shot animations (death/fall) play once and then HOLD their
     *  final frame instead of looping (the flicker fix). Sample across
     *  consecutive ticks: a `frame` that keeps changing after the animation
     *  ends ⇒ flicker; a `frame` that settles to a constant ⇒ fixed. */
    frameInfo: () =>
      (game.adudies as unknown as DudieView[]).map((d) => {
        const rs = renderStateByDudie.get(d as unknown as object);
        const pose = rs?.pose ?? poseForDudie(d);
        const tick = rs?.tick ?? 0;
        const index = d.team === "red" ? renderer.redIndex : renderer.greenIndex;
        const frame = index ? frameForState(index, pose, tick) : -1;
        return { team: d.team, dead: !!d.dead, down: !!d.down, pose, tick, frame };
      }),
    /** Charge-meter frame (1..15) for the currently-dragged red, or 0 if none.
     *  Lets E2E verify the gauge actually charges over a hold. */
    meterNow: () =>
      dragging ? chargeFrame(performance.now() - pressStart) : 0,
    /** Last-spawned snowball — used by E2E to verify spec/snowball.md
     *  initial xmov / ymov values without simulating physics. */
    lastSnowball: () => {
      const balls = game.snowballs;
      const last = balls[balls.length - 1];
      if (!last) return null;
      return {
        team: last.team,
        ballX: last.ballmc._x,
        ballY: last.ballmc._y,
        shadowX: last.shadowmc._x,
        shadowY: last.shadowmc._y,
        // SnowBall.as:43-52 — initial xmov/ymov are constants per team.
        // We surface the live fields when the factory is the real Snowball
        // class, but Game's default factory returns a stub. Read the spec
        // values from the factory's symbol if present.
        xmov: (last as unknown as { xmov?: number }).xmov ?? null,
        ymov: (last as unknown as { ymov?: number }).ymov ?? null,
      };
    },
    /** Hit a green dudie at index i: drive yougothit() — used by E2E to
     *  verify hp decreases by spec amount (1 per call) without running the
     *  full collision pipeline. */
    hitGreen: (i: number) => {
      const greens = game.adudies.filter((d) => d.team === "green");
      const target = greens[i];
      if (!target) return null;
      const before = target.hitpoints;
      target.yougothit();
      return {
        before,
        after: target.hitpoints,
        dead: !!target.dead,
        down: !!(target as DudieView).down,
      };
    },
    /** Kill all remaining greens (drives yougothit() until dead) — used by
     *  E2E to test level-clear → next level transition. */
    killAllGreens: () => {
      for (const d of game.adudies) {
        if (d.team === "green") {
          while (!d.dead) d.yougothit();
        }
      }
    },
    /** Kill all remaining reds — used by E2E to test player-hp-depleted →
     *  game-over screen. */
    killAllReds: () => {
      for (const d of game.adudies) {
        if (d.team === "red") {
          while (!d.dead) d.yougothit();
        }
      }
    },
    /** Run a single frameloop tick — used by E2E to deterministically
     *  advance the game state machine without waiting on rAF cadence. */
    tick: () => {
      game.frameloop();
    },
    /** Throw a snowball directly — used by E2E to verify snowball spawn
     *  + Sfx label without simulating mouse press/release timing. */
    throwSnowball: (
      team: "red" | "green",
      force: number,
      x: number,
      y: number
    ) => {
      game.throwball({
        team,
        force,
        x,
        y,
        ineffective: force < 0.1,
      });
    },
    /** Collide-and-hit: spawn a red snowball directly on top of the i-th live
     *  green and run one frameloop tick. Mirrors Snowcraft1Rewrite.as:366
     *  hit predicate. Used by E2E for the "hit enemy" scenario. */
    spawnAndHit: (i: number) => {
      const greens = game.adudies.filter((d) => d.team === "green" && !d.dead);
      const target = greens[i];
      if (!target) return null;
      const beforeHp = target.hitpoints;
      const beforeScore = game.score;
      // Spawn a red ball already inside the hit-square (±30 px x, ±30 px
      // y around dudiemc._y - 20). Use force=0.5 so it's NOT ineffective.
      game.throwball({
        team: "red",
        force: 0.5,
        x: target.dudiemc._x,
        y: target.dudiemc._y - 20,
        ineffective: false,
      });
      // Trigger collision via Game.frameloop (Snowcraft1Rewrite.as:354-393).
      game.frameloop();
      return {
        beforeHp,
        afterHp: target.hitpoints,
        scoreDelta: game.score - beforeScore,
        dead: !!target.dead,
      };
    },
  };
  (window as unknown as { __snowcraft: typeof debug }).__snowcraft = debug;

  requestAnimationFrame(tick);
}

void boot().catch((err) => {
  console.error("Snowcraft boot failed:", err);
});
