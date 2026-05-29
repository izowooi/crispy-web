import './style.css';
import { Game, FULL_CHARGE_TIME } from './core/game';
import { Renderer, type AimState } from './render/renderer';
import { SFX } from './audio/sfx';
import { Vector2 } from './core/vector2';
import { createInputState, readMoveAxis, chargeFromHoldMs } from './input/input';

const PLAYER_MOVE_SPEED = 140; // px/s

const canvas = document.getElementById('game') as HTMLCanvasElement;
const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
const hudLevel = document.getElementById('hud-level') as HTMLDivElement;
const hudScore = document.getElementById('hud-score') as HTMLDivElement;
const hudTeam = document.getElementById('hud-team') as HTMLDivElement;
const hudEnemy = document.getElementById('hud-enemy') as HTMLDivElement;

const sfx = new SFX();
const game = new Game({
  events: {
    onSnowballThrown: () => sfx.throwSound(),
    onSnowballHit: () => sfx.hitSound(),
    onLevelClear: () => sfx.levelClearSound(),
  },
});

const renderer = new Renderer(canvas);
const input = createInputState();

const FULL_CHARGE_MS = FULL_CHARGE_TIME * 1000;

const aim: AimState = { isAiming: false, charge: 0, pointerX: 0, pointerY: 0 };

function pointerToWorld(e: PointerEvent | MouseEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  return { x, y };
}

canvas.addEventListener('pointermove', (e) => {
  const { x, y } = pointerToWorld(e);
  input.mouse.x = x;
  input.mouse.y = y;
  aim.pointerX = x;
  aim.pointerY = y;
});

canvas.addEventListener('pointerdown', (e) => {
  sfx.resume();
  const { x, y } = pointerToWorld(e);
  input.mouse.x = x;
  input.mouse.y = y;
  aim.pointerX = x;
  aim.pointerY = y;
  input.isMouseDown = true;
  input.mouseDownStart = performance.now();
  aim.isAiming = true;
});

canvas.addEventListener('pointerup', () => {
  if (input.isMouseDown) {
    const heldMs = performance.now() - input.mouseDownStart;
    const charge = chargeFromHoldMs(heldMs, FULL_CHARGE_MS);
    if (game.phase === 'playing') {
      game.throwFromActive(new Vector2(input.mouse.x, input.mouse.y), charge);
    }
  }
  input.isMouseDown = false;
  aim.isAiming = false;
  aim.charge = 0;
});

canvas.addEventListener('pointerleave', () => {
  input.isMouseDown = false;
  aim.isAiming = false;
  aim.charge = 0;
});

window.addEventListener('keydown', (e) => {
  input.keys.add(e.key.toLowerCase());
  if (e.key === 'Tab') {
    e.preventDefault();
    game.cycleActivePlayer();
  }
  if (e.key === ' ') {
    e.preventDefault();
    if (game.phase === 'level-clear') game.advanceLevel();
    else if (game.phase === 'idle' || game.phase === 'game-over') {
      game.reset();
      game.startLevel(1);
    }
  }
});
window.addEventListener('keyup', (e) => {
  input.keys.delete(e.key.toLowerCase());
});

startBtn.addEventListener('click', () => {
  sfx.resume();
  if (game.phase === 'playing') return;
  game.reset();
  game.startLevel(1);
});

resetBtn.addEventListener('click', () => {
  game.reset();
});

function updateHUD(): void {
  hudLevel.textContent = `Level: ${game.level}`;
  hudScore.textContent = `Score: ${game.score}`;
  const teamAlive = game.players.filter((p) => p.isAlive).length;
  hudTeam.textContent = `Team: ${teamAlive} / ${game.players.length || 3}`;
  const enemiesAlive = game.cpus.filter((c) => c.isAlive).length;
  hudEnemy.textContent = `Enemies: ${game.enemiesRemaining} (on screen: ${enemiesAlive}) — ${game.phase}`;
}

let prevTs = performance.now();
function tick(ts: number): void {
  const dt = Math.min(0.05, (ts - prevTs) / 1000);
  prevTs = ts;

  // Player movement (active player only)
  const a = game.activePlayer;
  if (a && game.phase === 'playing') {
    const axis = readMoveAxis(input);
    a.velocity = axis.scale(PLAYER_MOVE_SPEED);
  }

  // Update charge while held
  if (input.isMouseDown) {
    aim.charge = chargeFromHoldMs(performance.now() - input.mouseDownStart, FULL_CHARGE_MS);
  }

  game.update(dt);
  renderer.draw(game, aim);
  updateHUD();
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// Expose for E2E tests / debugging
declare global {
  interface Window {
    __snowcraft: {
      game: Game;
      throwAt: (x: number, y: number, charge?: number) => void;
      forceKill: (kind: 'cpu' | 'player', n?: number) => void;
      startLevel: (n: number) => void;
    };
  }
}
window.__snowcraft = {
  game,
  throwAt(x: number, y: number, charge = 0.5) {
    game.throwFromActive(new Vector2(x, y), charge);
  },
  forceKill(kind, n = Infinity) {
    const list = kind === 'cpu' ? game.cpus : game.players;
    let killed = 0;
    for (const e of list) {
      if (killed >= n) break;
      if (e.isAlive) {
        e.takeDamage(e.health);
        killed++;
      }
    }
    if (kind === 'cpu') game.enemiesRemaining = Math.max(0, game.enemiesRemaining - killed);
  },
  startLevel(n) {
    game.reset();
    game.startLevel(n);
  },
};
