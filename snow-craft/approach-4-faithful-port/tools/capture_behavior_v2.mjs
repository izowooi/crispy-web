// V2: Each observation phase runs in a FRESH page load so the reds are at
// their start anchors and not dead from a previous phase.
//
// Run after the V1 baseline (which proved the SWF runs and showed phase 1+2
// data). This run focuses on phases 3, 4, 5 with isolated state.

import { chromium } from "/Users/jongwoopark/Downloads/temp/porting-web/snow-craft/approach-4-faithful-port/web/node_modules/playwright/index.mjs";
import * as fs from "node:fs";
import * as path from "node:path";

const OBS_DIR =
  "/Users/jongwoopark/Downloads/temp/porting-web/snow-craft/approach-4-faithful-port/observations";
const URL = "http://127.0.0.1:8765/index.html";

fs.mkdirSync(OBS_DIR, { recursive: true });
const log = (...a) => console.log("[v2]", ...a);
const stamp = (n) => path.join(OBS_DIR, n);

async function bootRuffle(browser) {
  const context = await browser.newContext({
    viewport: { width: 1024, height: 800 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on("pageerror", (err) => log("pageerror", err.message));
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  // wait for ruffle metadata
  for (let i = 0; i < 60; i++) {
    const ready = await page.evaluate(() => {
      const p = document.querySelector("ruffle-player");
      return !!(p && p.metadata);
    });
    if (ready) break;
    await page.waitForTimeout(500);
  }
  // Click canvas to dismiss unmute overlay and start audio.
  const rect = await page.evaluate(() => {
    const p = document.querySelector("ruffle-player");
    const r = p.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  await page.mouse.click(rect.x + rect.w / 2, rect.y + rect.h / 2);
  await page.waitForTimeout(800);
  // Move cursor far away
  await page.mouse.move(rect.x + rect.w + 80, rect.y + rect.h + 80);
  await page.waitForTimeout(300);
  return { context, page, rect };
}

function vp(rect, sx, sy) {
  return { x: rect.x + (sx * rect.w) / 592, y: rect.y + (sy * rect.h) / 320 };
}

async function shot(page, name, rect) {
  const r = rect || (await page.evaluate(() => {
    const p = document.querySelector("ruffle-player");
    const rr = p.getBoundingClientRect();
    return { x: rr.x, y: rr.y, w: rr.width, h: rr.height };
  }));
  const p = stamp(name);
  await page.screenshot({
    path: p,
    clip: {
      x: Math.max(0, Math.floor(r.x)),
      y: Math.max(0, Math.floor(r.y)),
      width: Math.ceil(r.w),
      height: Math.ceil(r.h),
    },
  });
  log("shot", name);
  return p;
}

async function phase3_selectionCircle(browser) {
  log("phase 3 — selection circle");
  const { context, page, rect } = await bootRuffle(browser);
  // Wait briefly so reds finish walking to anchors. They walk from
  // (start+200, start+100) to (start, start), distance ~223 with walkspeed=5,
  // ~45 frames @ 20fps = ~2.25s.
  await page.waitForTimeout(3000);

  // a) cursor far away from any red (top-left of canvas)
  const far = vp(rect, 5, 5);
  await page.mouse.move(far.x, far.y);
  await page.waitForTimeout(400);
  const a = await shot(page, "v2_03_circle_a_cursor_far.png", rect);

  // b) cursor over a red — try (450, 200) which is reddudie1 anchor
  const overR1 = vp(rect, 450, 200);
  await page.mouse.move(overR1.x, overR1.y);
  await page.waitForTimeout(300);
  const b1 = await shot(page, "v2_03_circle_b_over_r1_450_200.png", rect);

  const overR2 = vp(rect, 420, 260);
  await page.mouse.move(overR2.x, overR2.y);
  await page.waitForTimeout(300);
  const b2 = await shot(page, "v2_03_circle_b_over_r2_420_260.png", rect);

  const overR3 = vp(rect, 310, 250);
  await page.mouse.move(overR3.x, overR3.y);
  await page.waitForTimeout(300);
  const b3 = await shot(page, "v2_03_circle_b_over_r3_310_250.png", rect);

  // c) press+hold over the red — meter-charging frame
  await page.mouse.move(overR1.x, overR1.y);
  await page.waitForTimeout(150);
  await page.mouse.down();
  await page.waitForTimeout(250);
  const c = await shot(page, "v2_03_circle_c_press_hold.png", rect);
  await page.mouse.up();
  await page.waitForTimeout(200);

  // d) cursor moved off red while NOT pressed — circle should disappear
  await page.mouse.move(far.x, far.y);
  await page.waitForTimeout(400);
  const d = await shot(page, "v2_03_circle_d_cursor_far_again.png", rect);

  await context.close();
  return [a, b1, b2, b3, c, d];
}

async function phase4_meter(browser) {
  log("phase 4 — power meter");
  const { context, page, rect } = await bootRuffle(browser);
  await page.waitForTimeout(3000);
  const overR1 = vp(rect, 450, 200);
  await page.mouse.move(overR1.x, overR1.y);
  await page.waitForTimeout(150);
  await page.mouse.down();
  // do not move cursor — keep dudie under press at original anchor.
  // But press triggers drag => dudie teleports to cursor. Cursor IS at red anchor.
  const t0 = await shot(page, "v2_04_meter_t0.png", rect);
  await page.waitForTimeout(250);
  const t250 = await shot(page, "v2_04_meter_t250.png", rect);
  await page.waitForTimeout(250);
  const t500 = await shot(page, "v2_04_meter_t500.png", rect);
  await page.waitForTimeout(250);
  const t750 = await shot(page, "v2_04_meter_t750.png", rect);
  await page.waitForTimeout(250);
  const t1000 = await shot(page, "v2_04_meter_t1000.png", rect);
  // hold even longer — meter is supposed to top out at frame 15
  await page.waitForTimeout(500);
  const t1500 = await shot(page, "v2_04_meter_t1500.png", rect);
  await page.mouse.up();
  await page.waitForTimeout(300);
  const tAfter = await shot(page, "v2_04_meter_after_release.png", rect);

  await context.close();
  return [t0, t250, t500, t750, t1000, t1500, tAfter];
}

async function phase5_greenHP(browser) {
  log("phase 5 — green HP behavior");
  const { context, page, rect } = await bootRuffle(browser);

  // Wait for greens and reds to settle into start positions.
  // Greens for level 1 walk from (-20,-60), (-130,-60), (-130,1) to
  // (180,40), (70,40), (70,100). With default walkspeed=5 they take ~50 frames
  // = ~2.5s.
  await page.waitForTimeout(3500);

  const before = await shot(page, "v2_05_green_before.png", rect);

  // Pick reddudie1 (anchor (450,200)). Press+drag to (200, 80) so it's near
  // greens, then release. The throwball physics use force = meter/15;
  // initial velocity for red is xmov=-20, ymov=-10, plus force-modulated drop.
  // To reliably hit a green we need the red close.
  const r1 = vp(rect, 450, 200);
  await page.mouse.move(r1.x, r1.y);
  await page.waitForTimeout(150);
  await page.mouse.down();
  // drag to (160, 100) — just south-east of greens at (70,40) and (180,40)
  const drag1 = vp(rect, 160, 100);
  await page.mouse.move(drag1.x, drag1.y, { steps: 18 });
  await page.waitForTimeout(900);  // hold for meter
  const beforeRelease1 = await shot(page, "v2_05_a_before_release.png", rect);
  await page.mouse.up();
  await page.waitForTimeout(120);

  // Move cursor away so subsequent screenshots don't re-trigger the selection.
  await page.mouse.move(rect.x + rect.w + 50, rect.y + rect.h + 50);

  // Snowball lifecycle from RedSnowDudie spawn-y=-35: SnowBall xmov=-20,ymov=-10,
  // then drops; from (160, 65) it will curve up-and-left, hitting greens
  // around (60, 40). Wait long enough for impact (~30 frames = 1.5s).
  await page.waitForTimeout(1500);
  const after1 = await shot(page, "v2_05_after_throw_1.png", rect);

  // Throw 2: use red 2 (420,260) drag to (180,100)
  const r2 = vp(rect, 420, 260);
  await page.mouse.move(r2.x, r2.y);
  await page.waitForTimeout(150);
  await page.mouse.down();
  const drag2 = vp(rect, 180, 100);
  await page.mouse.move(drag2.x, drag2.y, { steps: 18 });
  await page.waitForTimeout(900);
  await page.mouse.up();
  await page.waitForTimeout(120);
  await page.mouse.move(rect.x + rect.w + 50, rect.y + rect.h + 50);
  await page.waitForTimeout(1500);
  const after2 = await shot(page, "v2_05_after_throw_2.png", rect);

  // Throw 3
  const r3 = vp(rect, 310, 250);
  await page.mouse.move(r3.x, r3.y);
  await page.waitForTimeout(150);
  await page.mouse.down();
  const drag3 = vp(rect, 200, 110);
  await page.mouse.move(drag3.x, drag3.y, { steps: 18 });
  await page.waitForTimeout(900);
  await page.mouse.up();
  await page.waitForTimeout(120);
  await page.mouse.move(rect.x + rect.w + 50, rect.y + rect.h + 50);
  await page.waitForTimeout(1500);
  const after3 = await shot(page, "v2_05_after_throw_3.png", rect);

  // Throw 4 — second hit on a still-standing green
  await page.mouse.move(r1.x + 0, r1.y + 0);
  await page.waitForTimeout(150);
  // It may have moved during walking; just attempt again from anchor zone
  await page.mouse.down();
  const drag4 = vp(rect, 180, 90);
  await page.mouse.move(drag4.x, drag4.y, { steps: 18 });
  await page.waitForTimeout(900);
  await page.mouse.up();
  await page.waitForTimeout(120);
  await page.mouse.move(rect.x + rect.w + 50, rect.y + rect.h + 50);
  await page.waitForTimeout(1500);
  const after4 = await shot(page, "v2_05_after_throw_4.png", rect);

  await context.close();
  return [before, beforeRelease1, after1, after2, after3, after4];
}

async function phase2_cadenceTight(browser) {
  // Higher resolution capture of the AI throw cadence — every 1 s for the first
  // 15 s, then 20, 25, 30 s. Keeps cursor far off-canvas so reds aren't dragged.
  log("phase 2 — cadence (fine)");
  const { context, page, rect } = await bootRuffle(browser);
  // No extra settle wait — start tracking from the moment the title overlay
  // is dismissed (i.e. immediately after bootRuffle, which already clicks).
  const shots = [];
  const start = Date.now();
  const targets = [1000, 2000, 3000, 4000, 5000, 6000, 8000, 10000, 12000, 15000, 20000, 25000, 30000];
  for (const t of targets) {
    const wait = t - (Date.now() - start);
    if (wait > 0) await page.waitForTimeout(wait);
    shots.push(await shot(page, `v2_02_cadence_t${t}ms.png`, rect));
  }
  await context.close();
  return shots;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const results = {};
    results.cadence = await phase2_cadenceTight(browser);
    results.circle = await phase3_selectionCircle(browser);
    results.meter = await phase4_meter(browser);
    results.greenHP = await phase5_greenHP(browser);
    fs.writeFileSync(stamp("_run_v2_summary.json"), JSON.stringify(results, null, 2));
    log("done");
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error("V2 failed:", e);
  process.exit(1);
});
