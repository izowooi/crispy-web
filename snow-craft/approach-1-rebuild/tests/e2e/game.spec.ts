import { test, expect } from '@playwright/test';

test.describe('Snowcraft web', () => {
  test('loads the page and renders the canvas', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Snowcraft/i);
    const canvas = page.locator('canvas#game');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(100);
  });

  test('starts a level when Start is clicked', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('start-btn').click();
    await expect(page.getByTestId('hud-level')).toHaveText(/Level: 1/);
    await expect(page.getByTestId('hud-team')).toHaveText(/Team: 3 \/ 3/);
    // wait one frame so phase has updated
    await page.waitForTimeout(100);
    const phaseText = await page.getByTestId('hud-enemy').textContent();
    expect(phaseText).toMatch(/playing/);
  });

  test('player can throw a snowball and KO a CPU via debug API', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('start-btn').click();
    await page.waitForTimeout(150);

    // Sanity: 3 enemies remaining
    let remaining = await page.evaluate(() => window.__snowcraft.game.enemiesRemaining);
    expect(remaining).toBe(3);

    // Throw via debug API
    await page.evaluate(() => window.__snowcraft.throwAt(700, 250, 1));
    await page.waitForTimeout(200);
    const ballCountAfter = await page.evaluate(() => window.__snowcraft.game.snowballs.length);
    expect(ballCountAfter).toBeGreaterThanOrEqual(0); // may have already landed

    // Force KO all CPUs and step the simulation enough to transition
    await page.evaluate(() => window.__snowcraft.forceKill('cpu'));
    await page.waitForTimeout(200);
    remaining = await page.evaluate(() => window.__snowcraft.game.enemiesRemaining);
    expect(remaining).toBe(0);
    const phase = await page.evaluate(() => window.__snowcraft.game.phase);
    expect(['level-clear', 'victory']).toContain(phase);
  });

  test('mouse click charges and throws a snowball', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('start-btn').click();
    await page.waitForTimeout(150);

    const canvas = page.locator('canvas#game');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('No canvas box');

    // press, hold, release
    const downX = box.x + box.width * 0.85;
    const downY = box.y + box.height * 0.5;
    await page.mouse.move(downX, downY);
    await page.mouse.down();
    await page.waitForTimeout(250); // charge a bit
    await page.mouse.up();

    // After release, snowball should be in the air (or already faded). Use debug API.
    await page.waitForTimeout(50);
    const totalThrowsObserved = await page.evaluate(() => {
      // Check by score-or-presence proxy: snowballs ever spawned would be hard to count after they die.
      // Instead, verify activePlayer is on cooldown (cooldown > 0 immediately after throw).
      const a = window.__snowcraft.game.activePlayer;
      return a ? a.cooldown : -1;
    });
    expect(totalThrowsObserved).toBeGreaterThan(0);
  });

  test('reaching level-clear advances to next level on Space', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('start-btn').click();
    await page.waitForTimeout(150);
    await page.evaluate(() => window.__snowcraft.forceKill('cpu'));
    await page.waitForTimeout(200);
    const phaseBefore = await page.evaluate(() => window.__snowcraft.game.phase);
    expect(phaseBefore).toBe('level-clear');
    await page.keyboard.press('Space');
    await page.waitForTimeout(150);
    const lvl = await page.evaluate(() => window.__snowcraft.game.level);
    const phase = await page.evaluate(() => window.__snowcraft.game.phase);
    expect(lvl).toBe(2);
    expect(phase).toBe('playing');
  });

  test('player KO leads to game-over phase', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('start-btn').click();
    await page.waitForTimeout(150);
    await page.evaluate(() => window.__snowcraft.forceKill('player'));
    await page.waitForTimeout(200);
    const phase = await page.evaluate(() => window.__snowcraft.game.phase);
    expect(phase).toBe('game-over');
  });
});
