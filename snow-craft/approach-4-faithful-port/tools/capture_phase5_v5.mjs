// Phase 5 v5 — single-shot drag using one quick mouse.move while held.
// Simpler than v4. Also tests if hold + immediate release without drag gives
// correct ineffective-throw vs hit.

import { chromium } from "/Users/jongwoopark/Downloads/temp/porting-web/snow-craft/approach-4-faithful-port/web/node_modules/playwright/index.mjs";
import * as fs from "node:fs";
import * as path from "node:path";

const OBS_DIR =
  "/Users/jongwoopark/Downloads/temp/porting-web/snow-craft/approach-4-faithful-port/observations";
const URL = "http://127.0.0.1:8765/index.html";
const log = (...a) => console.log("[v5]", ...a);
const stamp = (n) => path.join(OBS_DIR, n);

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
    await page.screenshot({ path: p, clip: { x: rect.x, y: rect.y, width: rect.w, height: rect.h } });
    log("shot", n);
    return p;
  };

  await page.mouse.click(rect.x + rect.w / 2, rect.y + rect.h / 2);
  await page.waitForTimeout(800);
  await page.mouse.move(rect.x + rect.w + 80, rect.y + rect.h + 80);
  await page.waitForTimeout(3500);

  await shot("v5_05_pre.png");

  // Test 1: simple press → tiny single drag move → screenshot → release
  let p = vp(450, 200);
  await page.mouse.move(p.x, p.y);
  await page.waitForTimeout(80);
  await page.mouse.down();
  await page.waitForTimeout(150);
  // Single mouse move while down to (200, 100)
  let target = vp(200, 100);
  await page.mouse.move(target.x, target.y);
  await page.waitForTimeout(800);  // give SWF time to teleport dudie + charge meter
  await shot("v5_05_test1_during_drag.png");
  await page.mouse.up();
  await page.waitForTimeout(120);
  await page.mouse.move(rect.x + rect.w + 80, rect.y + rect.h + 80);
  await page.waitForTimeout(800);
  await shot("v5_05_test1_after_release.png");

  // Test 2: same but with drag toward green at (70,40)
  await page.waitForTimeout(800);
  p = vp(420, 260);
  await page.mouse.move(p.x, p.y);
  await page.waitForTimeout(80);
  await page.mouse.down();
  await page.waitForTimeout(150);
  target = vp(70, 60);
  await page.mouse.move(target.x, target.y);
  await page.waitForTimeout(900);
  await shot("v5_05_test2_during_drag.png");
  await page.mouse.up();
  await page.waitForTimeout(80);
  await page.mouse.move(rect.x + rect.w + 80, rect.y + rect.h + 80);
  await page.waitForTimeout(200);
  await shot("v5_05_test2_immediate.png");
  await page.waitForTimeout(700);
  await shot("v5_05_test2_settled.png");

  // Test 3: HIT 1 - same dragspot, repeat to land second snowball on same green
  await page.waitForTimeout(500);
  p = vp(310, 250);
  await page.mouse.move(p.x, p.y);
  await page.waitForTimeout(80);
  await page.mouse.down();
  await page.waitForTimeout(150);
  target = vp(70, 60);
  await page.mouse.move(target.x, target.y);
  await page.waitForTimeout(900);
  await shot("v5_05_test3_during_drag.png");
  await page.mouse.up();
  await page.waitForTimeout(80);
  await page.mouse.move(rect.x + rect.w + 80, rect.y + rect.h + 80);
  await page.waitForTimeout(900);
  await shot("v5_05_test3_settled.png");

  await browser.close();
}

main().catch((e) => {
  console.error("v5 failed", e);
  process.exit(1);
});
