// Visual regression for the "blank screen after Start" bug.
//
// Pre-fix repro: Start was clicked → frameloop ran on entity stubs whose
// frameloop() was a no-op → reds spawned at (650, 300) (off-stage) and
// greens at negative coords (off-stage) → canvas only showed the
// gamemc_background sprite, no characters.
//
// This spec asserts that within ~5 seconds of Start, the on-canvas pixel
// histogram contains both red-team and green-team character pixels (i.e.
// the extracted PNGs have actually been blitted into the visible stage).

import { expect, test } from "@playwright/test";

declare global {
  interface Window {
    __snowcraft: {
      isReady: boolean;
      start: () => void;
      tick: () => void;
      counts: () => { greens: number; reds: number; level: number; gameover: boolean };
    };
  }
}

async function waitReady(page: import("@playwright/test").Page) {
  await page.waitForFunction(() => Boolean(window.__snowcraft?.isReady), null, {
    timeout: 5000,
  });
}

test("after Start, both teams' sprites are blitted on the visible stage", async ({
  page,
}) => {
  await page.goto("/");
  await waitReady(page);
  await page.evaluate(() => window.__snowcraft.start());
  await page.waitForFunction(() => window.__snowcraft.counts().level === 1);

  // Drive enough frameloop ticks for the walk-in animation to land everyone
  // inside the 592x320 stage. Reds: dist ≤ sqrt(200^2+100^2)/walkspeed=5
  // ≈ 45 frames. Greens: similar order. 80 ticks is comfortable margin.
  await page.evaluate(() => {
    for (let i = 0; i < 80; i++) window.__snowcraft.tick();
  });

  // After ticks, force one rAF paint so the renderer commits the new state to
  // the canvas before we sample.
  await page.evaluate(
    () =>
      new Promise<void>((res) => {
        requestAnimationFrame(() => requestAnimationFrame(() => res()));
      }),
  );

  const histo = await page.evaluate(() => {
    const c = document.getElementById("game") as HTMLCanvasElement;
    const ctx = c.getContext("2d")!;
    const img = ctx.getImageData(0, 0, c.width, c.height);
    let redLikely = 0;
    let greenLikely = 0;
    for (let i = 0; i < img.data.length; i += 4) {
      const r = img.data[i],
        g = img.data[i + 1],
        b = img.data[i + 2];
      // Red-team body has saturated red dominance.
      if (r > 150 && g < 110 && b < 110) redLikely++;
      // Green-team body has saturated green dominance.
      if (g > 130 && r < 130 && b < 130) greenLikely++;
    }
    return { redLikely, greenLikely, total: img.data.length / 4 };
  });

  // Both teams must contribute a non-trivial pixel band. If the walk-in
  // logic is broken the chars stay off-stage and either count is ~0.
  expect(histo.redLikely).toBeGreaterThan(200);
  expect(histo.greenLikely).toBeGreaterThan(200);

  // Sanity: counts() agrees that 3 reds + 3 greens are alive (level 1).
  const counts = await page.evaluate(() => window.__snowcraft.counts());
  expect(counts.reds).toBe(3);
  expect(counts.greens).toBe(3);

  // -------------------------------------------------------------------------
  // Additional visual assertion — "after Start + 80 ticks" snapshot region.
  //
  // The full-frame counts above guard against the "blank canvas" regression.
  // To pin down the *spatial* expectation (chars are not just rendered
  // somewhere, they are rendered inside the playable stage), we sample a
  // sub-region of the canvas (the upper-left + lower-right diagonal where
  // greens and reds settle on level 1) and require BOTH teams' colour bands
  // to populate it. The histogram bound (red>200 ∧ green>200 pixels) is
  // preserved, but applied to a 470×270 region instead of the full
  // 592×320 canvas — so a regression that pushes a team off-stage or
  // outside this band still trips the bound.
  //
  // Empirical placement (level 1, after 80 ticks):
  //   greens land around (20..160, 15..80) — upper-left corner of stage
  //   reds   land around (260..480, 170..240) — middle-right of stage
  // Region (10, 10, 480, 270) covers both clusters with margin.
  //
  // We also save a diagnostic PNG of the canvas at this moment so a future
  // regression can be visually inspected via Read on the screenshot.
  await page.locator("#game").screenshot({
    path: "test-results/visibility-after-80-ticks.png",
  });

  const regionHisto = await page.evaluate(() => {
    const c = document.getElementById("game") as HTMLCanvasElement;
    const ctx = c.getContext("2d")!;
    const rx = 10;
    const ry = 10;
    const rw = 480;
    const rh = 270;
    const img = ctx.getImageData(rx, ry, rw, rh);
    let redLikely = 0;
    let greenLikely = 0;
    for (let i = 0; i < img.data.length; i += 4) {
      const r = img.data[i];
      const g = img.data[i + 1];
      const b = img.data[i + 2];
      if (r > 150 && g < 110 && b < 110) redLikely++;
      if (g > 130 && r < 130 && b < 130) greenLikely++;
    }
    return { redLikely, greenLikely, area: rw * rh };
  });

  // Both teams contribute >200 saturated pixels INSIDE the region. If a
  // regression pushes a team off-stage, outside the upper-left/middle-right
  // zone, or compresses the dudies into a tight strip the bound trips and
  // the diagnostic PNG above narrows down the cause.
  expect(regionHisto.redLikely).toBeGreaterThan(200);
  expect(regionHisto.greenLikely).toBeGreaterThan(200);
});
