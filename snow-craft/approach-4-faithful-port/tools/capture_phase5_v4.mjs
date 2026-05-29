// Phase 5 v4 — drag with explicit micro-steps and longer settle waits.
// Based on observation that Ruffle accepts mousedown (selection circle + meter
// shown) but did not move the dudie when calling page.mouse.move while button
// down. Try: many small explicit move events with await between each, so each
// frame tick of the SWF has a chance to read stage._xmouse.

import { chromium } from "/Users/jongwoopark/Downloads/temp/porting-web/snow-craft/approach-4-faithful-port/web/node_modules/playwright/index.mjs";
import * as fs from "node:fs";
import * as path from "node:path";

const OBS_DIR =
  "/Users/jongwoopark/Downloads/temp/porting-web/snow-craft/approach-4-faithful-port/observations";
const URL = "http://127.0.0.1:8765/index.html";

const log = (...a) => console.log("[v4]", ...a);
const stamp = (n) => path.join(OBS_DIR, n);

function frameDelay() {
  return 60; // ~1 SWF frame at 20fps + buffer
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1024, height: 800 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => log("pageerror", e.message));
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  for (let i = 0; i < 60; i++) {
    const ok = await page.evaluate(() => {
      const p = document.querySelector("ruffle-player");
      return !!(p && p.metadata);
    });
    if (ok) break;
    await page.waitForTimeout(500);
  }
  const rect = await page.evaluate(() => {
    const r = document.querySelector("ruffle-player").getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const vp = (sx, sy) => ({
    x: rect.x + (sx * rect.w) / 592,
    y: rect.y + (sy * rect.h) / 320,
  });
  const shot = async (n) => {
    const p = stamp(n);
    await page.screenshot({
      path: p,
      clip: { x: rect.x, y: rect.y, width: rect.w, height: rect.h },
    });
    log("shot", n);
    return p;
  };

  // Boot
  await page.mouse.click(rect.x + rect.w / 2, rect.y + rect.h / 2);
  await page.waitForTimeout(800);
  await page.mouse.move(rect.x + rect.w + 80, rect.y + rect.h + 80);
  await page.waitForTimeout(3500); // settle for greens to walk in too

  await shot("v4_05_t0_pre.png");

  // Helper: drag from canvas (sx0,sy0) to (sx1,sy1) with N micro-steps and
  // 1-frame waits between, holding the button down throughout.
  async function dragRedTo(sx0, sy0, sx1, sy1, steps = 25) {
    const a = vp(sx0, sy0);
    await page.mouse.move(a.x, a.y);
    await page.waitForTimeout(60);
    await page.mouse.down();
    await page.waitForTimeout(120);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const sx = sx0 + (sx1 - sx0) * t;
      const sy = sy0 + (sy1 - sy0) * t;
      const v = vp(sx, sy);
      await page.mouse.move(v.x, v.y);
      await page.waitForTimeout(frameDelay());
    }
  }

  // Throw 1 — drag red1 to be ON TOP of green at (70,40) → release.
  await dragRedTo(450, 200, 70, 50, 30);
  // Charge meter to max for guaranteed force=1.0
  await page.waitForTimeout(800);
  const t1_pre = await shot("v4_05_t1_drag_done.png");
  await page.mouse.up();
  await page.waitForTimeout(80);
  await page.mouse.move(rect.x + rect.w + 80, rect.y + rect.h + 80);
  await page.waitForTimeout(150);
  const t1_immediate = await shot("v4_05_t1_after_release_immediate.png");
  await page.waitForTimeout(700);
  const t1 = await shot("v4_05_t1_hit1_settled.png");

  // Throw 2 — drag red2 to (70, 50) again
  await dragRedTo(420, 260, 70, 50, 30);
  await page.waitForTimeout(800);
  await page.mouse.up();
  await page.waitForTimeout(80);
  await page.mouse.move(rect.x + rect.w + 80, rect.y + rect.h + 80);
  await page.waitForTimeout(150);
  const t2_immediate = await shot("v4_05_t2_after_release_immediate.png");
  await page.waitForTimeout(700);
  const t2 = await shot("v4_05_t2_hit2_settled.png");

  // Throw 3 — should kill green (third hit takes hp from 1 to 0)
  await dragRedTo(310, 250, 70, 50, 30);
  await page.waitForTimeout(800);
  await page.mouse.up();
  await page.waitForTimeout(80);
  await page.mouse.move(rect.x + rect.w + 80, rect.y + rect.h + 80);
  await page.waitForTimeout(800);
  const t3 = await shot("v4_05_t3_hit3_settled.png");

  await browser.close();
  log("done");
}

main().catch((e) => {
  console.error("V4 failed:", e);
  process.exit(1);
});
