// Snowcraft / Ruffle behavior capture harness.
// Drives the SWF in Chromium via Playwright, takes screenshots into
// approach-4-faithful-port/observations/, and writes a JSON summary.
//
// Usage:
//   node tools/capture_behavior.mjs
//
// Assumes:
//   - python3 -m http.server 8765 is running in approach-3-ruffle/.
//   - Playwright is available at web/node_modules.

import { chromium } from "/Users/jongwoopark/Downloads/temp/porting-web/snow-craft/approach-4-faithful-port/web/node_modules/playwright/index.mjs";
import * as fs from "node:fs";
import * as path from "node:path";

const OBS_DIR =
  "/Users/jongwoopark/Downloads/temp/porting-web/snow-craft/approach-4-faithful-port/observations";
const URL = "http://127.0.0.1:8765/index.html";

const log = (...a) => console.log("[capture]", ...a);
fs.mkdirSync(OBS_DIR, { recursive: true });

function stamp(name) {
  return path.join(OBS_DIR, name);
}

async function waitForRuffleReady(page, timeoutMs = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const state = await page.evaluate(() => {
      const r = window.RufflePlayer;
      const player =
        document.getElementById("ruffle-instance") ||
        document.querySelector("#snowcraft-player ruffle-player") ||
        document.querySelector("ruffle-player");
      const meta = player && player.metadata;
      const rect = player && player.getBoundingClientRect();
      return {
        hasRufflePlayer: !!r,
        hasNewest: !!(r && r.newest),
        playerExists: !!player,
        playerTag: player ? player.tagName : null,
        hasMeta: !!meta,
        meta: meta ? { width: meta.width, height: meta.height, swfVersion: meta.swfVersion } : null,
        rect: rect ? { x: rect.x, y: rect.y, w: rect.width, h: rect.height } : null,
        statusText: (document.getElementById("status") || {}).textContent || null,
      };
    });
    if (state.hasMeta) {
      return state;
    }
    if (Date.now() - t0 > 5000 && (Date.now() - t0) % 5000 < 500) {
      log("waiting for ruffle…", state);
    }
    await page.waitForTimeout(400);
  }
  throw new Error("Ruffle did not become ready in 30s");
}

async function getCanvasRect(page) {
  return await page.evaluate(() => {
    const player =
      document.getElementById("ruffle-instance") ||
      document.querySelector("ruffle-player");
    if (!player) return null;
    const r = player.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
}

// Convert a canvas-local coord (0..592, 0..320) into a viewport coord based on the
// Ruffle player rect. The SWF stage is 592x320, the rendered rect is 592x320 too
// (CSS sized in index.html), so this is direct.
function toViewport(rect, sx, sy) {
  // The stage is "scale: showAll, letterbox: on", so it's drawn into the rect
  // preserving aspect ratio. The rect aspect is 592/320 = 1.85, same as native.
  const scaleX = rect.w / 592;
  const scaleY = rect.h / 320;
  return { x: rect.x + sx * scaleX, y: rect.y + sy * scaleY };
}

async function shot(page, name) {
  const p = stamp(name);
  // Screenshot only the player rect, so cropping is consistent.
  const rect = await getCanvasRect(page);
  if (rect) {
    await page.screenshot({
      path: p,
      clip: {
        x: Math.max(0, Math.floor(rect.x)),
        y: Math.max(0, Math.floor(rect.y)),
        width: Math.ceil(rect.w),
        height: Math.ceil(rect.h),
      },
    });
  } else {
    await page.screenshot({ path: p });
  }
  log("shot", name);
  return p;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1024, height: 800 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "warning" || msg.type() === "error") {
      log("console", msg.type(), msg.text());
    }
  });
  page.on("pageerror", (err) => log("pageerror", err.message));

  log("loading", URL);
  await page.goto(URL, { waitUntil: "domcontentloaded" });

  let readyState;
  try {
    readyState = await waitForRuffleReady(page, 30000);
    log("ruffle ready", readyState);
  } catch (e) {
    const status = await page.evaluate(
      () => document.getElementById("status")?.textContent || ""
    );
    fs.writeFileSync(
      path.join(OBS_DIR, "RUFFLE_BLOCKERS.md"),
      `# Ruffle failed to load\n\n- url: ${URL}\n- error: ${e.message}\n- status text: ${status}\n`
    );
    await shot(page, "00_ruffle_failed.png");
    await browser.close();
    return { failed: true, reason: e.message };
  }

  const rect = await getCanvasRect(page);
  log("player rect", rect);

  // ============================================================
  // Phase 1 — title screen (before any interaction)
  // ============================================================
  const obs = [];
  const title0 = await shot(page, "01_title_t0_pre_click.png");

  // Click canvas centre to dismiss any unmute overlay / start the SWF audio.
  const centre = toViewport(rect, 296, 160);
  await page.mouse.move(centre.x, centre.y);
  await page.waitForTimeout(150);
  await page.mouse.click(centre.x, centre.y);
  await page.waitForTimeout(800);
  const title1 = await shot(page, "01_title_t1_post_click.png");

  // Move cursor far away so subsequent observations aren't influenced by hover.
  await page.mouse.move(rect.x + rect.w + 50, rect.y + rect.h + 50);
  await page.waitForTimeout(300);
  const title2 = await shot(page, "01_title_t2_cursor_off.png");

  obs.push({ phase: 1, screenshots: [title0, title1, title2] });

  // ============================================================
  // Phase 2 — AI throw cadence (30 s of no input)
  // ============================================================
  // First we need to be IN-GAME, not on the title. The title is dismissed by
  // clicking somewhere; in the original SWF the title overlay yields control
  // via its own animation. We just keep cursor off-canvas and screenshot.
  const cadenceShots = [];
  const startT = Date.now();
  const targetTimes = [2000, 5000, 10000, 20000, 30000];
  for (const t of targetTimes) {
    const wait = t - (Date.now() - startT);
    if (wait > 0) await page.waitForTimeout(wait);
    const f = await shot(page, `02_cadence_t${t}ms.png`);
    cadenceShots.push(f);
  }
  obs.push({ phase: 2, screenshots: cadenceShots });

  // ============================================================
  // Phase 3 — Selection circle visibility
  // ============================================================
  // Reds spawn at (450,200), (420,260), (310,250) and walk in toward them.
  // After 30s of no input, they're at their start positions.
  // a) cursor far from any red
  await page.mouse.move(rect.x + 5, rect.y + 5);
  await page.waitForTimeout(400);
  const circleAway = await shot(page, "03_circle_a_cursor_far.png");

  // b) cursor over a red — try (450,200) then (420,260) then (310,250)
  const redCandidates = [
    [450, 200],
    [420, 260],
    [310, 250],
  ];
  const circleOverShots = [];
  for (let i = 0; i < redCandidates.length; i++) {
    const [sx, sy] = redCandidates[i];
    const v = toViewport(rect, sx, sy);
    await page.mouse.move(v.x, v.y);
    await page.waitForTimeout(300);
    circleOverShots.push(
      await shot(page, `03_circle_b_over_red${i}_${sx}_${sy}.png`)
    );
  }

  // c) press+hold over the first red and screenshot
  const holdAt = toViewport(rect, redCandidates[0][0], redCandidates[0][1]);
  await page.mouse.move(holdAt.x, holdAt.y);
  await page.waitForTimeout(120);
  await page.mouse.down();
  await page.waitForTimeout(250);
  const circleHold = await shot(page, "03_circle_c_press_hold.png");
  await page.mouse.up();
  await page.waitForTimeout(400);

  obs.push({
    phase: 3,
    screenshots: [circleAway, ...circleOverShots, circleHold],
  });

  // ============================================================
  // Phase 4 — Power meter gauge while holding
  // ============================================================
  // Find a red that's responsive (move cursor over each, look for selection
  // circle by visual change). For the screenshot purposes, just press+hold on
  // the first red and snap at 0/250/500/750/1000ms.
  const meterAt = toViewport(rect, redCandidates[0][0], redCandidates[0][1]);
  await page.mouse.move(meterAt.x, meterAt.y);
  await page.waitForTimeout(150);
  await page.mouse.down();
  const meter0 = await shot(page, "04_meter_t0.png");
  await page.waitForTimeout(250);
  const meter250 = await shot(page, "04_meter_t250.png");
  await page.waitForTimeout(250);
  const meter500 = await shot(page, "04_meter_t500.png");
  await page.waitForTimeout(250);
  const meter750 = await shot(page, "04_meter_t750.png");
  await page.waitForTimeout(250);
  const meter1000 = await shot(page, "04_meter_t1000.png");
  await page.mouse.up();
  await page.waitForTimeout(500);

  obs.push({
    phase: 4,
    screenshots: [meter0, meter250, meter500, meter750, meter1000],
  });

  // ============================================================
  // Phase 5 — Green HP behavior (1st hit vs 2nd hit)
  // ============================================================
  // Strategy: drag a red dudie near the upper-left where greens spawn (around
  // x≈40..80, y≈40..80 in level 1 the greens walk to (180,40), (70,40),
  // (70,100)). So drag the red to ~(120, 80) and throw toward (70,40).
  // Wait a moment for state to settle.
  await page.waitForTimeout(400);

  // Capture "before any hit" baseline.
  const greenBefore = await shot(page, "05_green_before_any_hit.png");

  // First try: pick the red at (450,200), drag to (140, 120), then release with
  // the cursor over a green (~70,40). To do this faithfully:
  // 1. Mouse down on red at canvas position (450,200).
  // 2. Move (drag) to (140, 120).
  // 3. Release at (70, 40) — release point is where the red has been dragged to;
  //    the SWF's release dispatches throwball() from the red's _x/_y at the
  //    release frame. So actually we need to drag close enough that the throw's
  //    trajectory (xmov=-20, ymov=-10 per frame from a force) reaches the
  //    green. Approximation: drag to (140, 100) and release.
  let dragRed = toViewport(rect, 450, 200);
  await page.mouse.move(dragRed.x, dragRed.y);
  await page.waitForTimeout(120);
  await page.mouse.down();
  await page.waitForTimeout(150);
  // Drag to approach green
  let near = toViewport(rect, 200, 120);
  await page.mouse.move(near.x, near.y, { steps: 12 });
  await page.waitForTimeout(150);
  // Hold for power
  await page.waitForTimeout(800);
  // Release (no further move)
  await page.mouse.up();
  await page.waitForTimeout(150);

  // Wait for snowball to travel + impact
  await page.waitForTimeout(1500);
  const greenAfter1 = await shot(page, "05_green_after_first_hit.png");

  // Try a second throw to the same area
  // Pick another red: (310,250) — drag to (180,80) and throw
  dragRed = toViewport(rect, 420, 260);
  await page.mouse.move(dragRed.x, dragRed.y);
  await page.waitForTimeout(120);
  await page.mouse.down();
  await page.waitForTimeout(150);
  near = toViewport(rect, 200, 120);
  await page.mouse.move(near.x, near.y, { steps: 12 });
  await page.waitForTimeout(800);
  await page.mouse.up();
  await page.waitForTimeout(1500);
  const greenAfter2 = await shot(page, "05_green_after_second_hit.png");

  // Third throw for safety
  dragRed = toViewport(rect, 310, 250);
  await page.mouse.move(dragRed.x, dragRed.y);
  await page.waitForTimeout(120);
  await page.mouse.down();
  await page.waitForTimeout(150);
  near = toViewport(rect, 220, 120);
  await page.mouse.move(near.x, near.y, { steps: 12 });
  await page.waitForTimeout(800);
  await page.mouse.up();
  await page.waitForTimeout(1500);
  const greenAfter3 = await shot(page, "05_green_after_third_hit.png");

  obs.push({
    phase: 5,
    screenshots: [greenBefore, greenAfter1, greenAfter2, greenAfter3],
  });

  // Final overall screenshot
  await shot(page, "99_final_state.png");

  await browser.close();
  return { failed: false, observations: obs };
}

main()
  .then((r) => {
    fs.writeFileSync(stamp("_run_summary.json"), JSON.stringify(r, null, 2));
    log("done");
    process.exit(r.failed ? 2 : 0);
  })
  .catch((e) => {
    console.error("CAPTURE FAILED:", e);
    process.exit(1);
  });
