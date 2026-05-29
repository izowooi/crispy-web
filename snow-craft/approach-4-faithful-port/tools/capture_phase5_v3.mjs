// Phase 5 v3 — drag a red dudie ON TOP of a green and release at point-blank.
// At very close range, even a low-force throw lands as a hit. Aim is to see:
// (a) does the green fall on the FIRST hit, or stay up until SECOND hit?
//
// AS source ground truth: GreenSnowDudie.as:43-66 — hp starts at 3.
//   hp=3 → 2: gotoAndPlay("hit"), justhit=true, freeze 50 frames.
//   hp=2 → 1: gotoAndPlay("down"), down=true.       <-- "fall down"
//   hp=1 → 0: gotoAndPlay("dead"), dead=true.
// So FIRST hit only daze (hit), SECOND hit makes them fall down.

import { chromium } from "/Users/jongwoopark/Downloads/temp/porting-web/snow-craft/approach-4-faithful-port/web/node_modules/playwright/index.mjs";
import * as fs from "node:fs";
import * as path from "node:path";

const OBS_DIR =
  "/Users/jongwoopark/Downloads/temp/porting-web/snow-craft/approach-4-faithful-port/observations";
const URL = "http://127.0.0.1:8765/index.html";

const log = (...a) => console.log("[v3]", ...a);
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
    await page.screenshot({
      path: p,
      clip: { x: rect.x, y: rect.y, width: rect.w, height: rect.h },
    });
    log("shot", n);
    return p;
  };

  // Click to dismiss unmute
  await page.mouse.click(rect.x + rect.w / 2, rect.y + rect.h / 2);
  await page.waitForTimeout(800);
  await page.mouse.move(rect.x + rect.w + 80, rect.y + rect.h + 80);
  await page.waitForTimeout(2500); // settle

  const before = await shot("v3_05_before.png");

  // Greens at level 1 walk to (180,40), (70,40), (70,100). Pick the green at
  // (70, 100) — it's at lower-left of the green start zone.
  // Drag red1 (anchor 450,200) all the way over to (75, 100) to hit point-blank.
  await page.mouse.move(vp(450, 200).x, vp(450, 200).y);
  await page.waitForTimeout(150);
  await page.mouse.down();
  await page.waitForTimeout(150);

  // Slowly drag red dudie over the green
  const dest1 = vp(80, 100);
  await page.mouse.move(dest1.x, dest1.y, { steps: 30 });
  await page.waitForTimeout(250);
  const onGreen1 = await shot("v3_05_red_on_green_pre_hit1.png");
  await page.waitForTimeout(700);  // charge meter to max
  // Release for FIRST hit
  await page.mouse.up();
  await page.waitForTimeout(120);
  // Move cursor away
  await page.mouse.move(rect.x + rect.w + 80, rect.y + rect.h + 80);
  // Shorter wait — the snowball will land in 1-2 frames since point-blank
  await page.waitForTimeout(300);
  const afterHit1_immediate = await shot("v3_05_after_hit1_immediate.png");
  await page.waitForTimeout(700);
  const afterHit1 = await shot("v3_05_after_hit1.png");
  await page.waitForTimeout(1000);
  const afterHit1_late = await shot("v3_05_after_hit1_late.png");

  // SECOND hit — same drill, drag a different red over to the same green
  // (which should still be alive after 1 hit if AS is faithful: hp=2 dazed).
  await page.mouse.move(vp(420, 260).x, vp(420, 260).y);
  await page.waitForTimeout(150);
  await page.mouse.down();
  await page.waitForTimeout(150);
  const dest2 = vp(80, 100);
  await page.mouse.move(dest2.x, dest2.y, { steps: 30 });
  await page.waitForTimeout(250);
  await page.waitForTimeout(700);
  await page.mouse.up();
  await page.waitForTimeout(120);
  await page.mouse.move(rect.x + rect.w + 80, rect.y + rect.h + 80);
  await page.waitForTimeout(300);
  const afterHit2_immediate = await shot("v3_05_after_hit2_immediate.png");
  await page.waitForTimeout(700);
  const afterHit2 = await shot("v3_05_after_hit2.png");
  await page.waitForTimeout(1000);
  const afterHit2_late = await shot("v3_05_after_hit2_late.png");

  // THIRD hit
  await page.mouse.move(vp(310, 250).x, vp(310, 250).y);
  await page.waitForTimeout(150);
  await page.mouse.down();
  await page.waitForTimeout(150);
  const dest3 = vp(80, 100);
  await page.mouse.move(dest3.x, dest3.y, { steps: 30 });
  await page.waitForTimeout(250);
  await page.waitForTimeout(700);
  await page.mouse.up();
  await page.waitForTimeout(120);
  await page.mouse.move(rect.x + rect.w + 80, rect.y + rect.h + 80);
  await page.waitForTimeout(300);
  const afterHit3 = await shot("v3_05_after_hit3.png");
  await page.waitForTimeout(1000);
  const afterHit3_late = await shot("v3_05_after_hit3_late.png");

  await browser.close();

  fs.writeFileSync(
    stamp("_run_v3_summary.json"),
    JSON.stringify(
      {
        before,
        onGreen1,
        afterHit1_immediate,
        afterHit1,
        afterHit1_late,
        afterHit2_immediate,
        afterHit2,
        afterHit2_late,
        afterHit3,
        afterHit3_late,
      },
      null,
      2
    )
  );
  log("done");
}

main().catch((e) => {
  console.error("V3 failed:", e);
  process.exit(1);
});
