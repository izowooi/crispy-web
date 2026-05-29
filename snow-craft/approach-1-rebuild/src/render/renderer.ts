import { Game, WORLD_WIDTH, WORLD_HEIGHT } from '../core/game';
import type { Player } from '../core/player';
import type { Snowball } from '../core/snowball';
import { TEAM_COLOR_HEX } from '../core/types';

interface Fort {
  x: number;
  y: number;
  rx: number;
  ry: number;
}

const PLAYER_FORTS: Fort[] = [
  { x: 180, y: 160, rx: 50, ry: 25 },
  { x: 200, y: 360, rx: 55, ry: 22 },
];
const CPU_FORTS: Fort[] = [
  { x: 600, y: 180, rx: 60, ry: 25 },
  { x: 620, y: 380, rx: 50, ry: 22 },
];

export interface AimState {
  isAiming: boolean;
  charge: number; // 0..1
  pointerX: number;
  pointerY: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;
  }

  draw(game: Game, aim: AimState): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Snow background gradient
    const grad = ctx.createRadialGradient(w * 0.5, h * 0.4, 50, w * 0.5, h * 0.5, w * 0.7);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, '#dceaf7');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Forts
    this.drawForts();

    // Sort entities by Y for fake depth
    const drawables: Array<{ y: number; draw: () => void }> = [];
    for (const p of game.players) drawables.push({ y: p.position.y, draw: () => this.drawPlayer(p, p === game.activePlayer) });
    for (const c of game.cpus) drawables.push({ y: c.position.y, draw: () => this.drawPlayer(c, false) });
    for (const b of game.snowballs) drawables.push({ y: b.position.y, draw: () => this.drawSnowball(b) });
    drawables.sort((a, b) => a.y - b.y);
    for (const d of drawables) d.draw();

    // Aim feedback
    if (aim.isAiming) this.drawAim(game, aim);

    // Phase overlays
    if (game.phase === 'level-clear') this.drawCenter('Level Clear! Press Space');
    if (game.phase === 'game-over') this.drawCenter('Game Over');
    if (game.phase === 'victory') this.drawCenter('Victory! Level 100 cleared');
    if (game.phase === 'idle') this.drawCenter('Press Start');
  }

  private drawForts(): void {
    const ctx = this.ctx;
    const list = [...PLAYER_FORTS, ...CPU_FORTS];
    for (const f of list) {
      ctx.fillStyle = 'rgba(180, 200, 220, 0.6)';
      ctx.beginPath();
      ctx.ellipse(f.x + 6, f.y + 8, f.rx, f.ry * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(f.x, f.y, f.rx, f.ry, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#bcd0e4';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  private drawPlayer(p: Player, isActive: boolean): void {
    const ctx = this.ctx;
    const r = p.radius;
    const x = p.position.x;
    const y = p.position.y;

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(x + 2, y + r - 2, r * 0.9, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    if (!p.isAlive) {
      // KO splash
      ctx.fillStyle = '#cfd8e3';
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.1, r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    const body = TEAM_COLOR_HEX[p.color];
    // body
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(x, y + 1, r * 0.85, r, 0, 0, Math.PI * 2);
    ctx.fill();

    // head
    ctx.fillStyle = '#f6d6b1';
    ctx.beginPath();
    ctx.arc(x, y - r * 0.65, r * 0.55, 0, Math.PI * 2);
    ctx.fill();

    // hat
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(x, y - r * 0.85, r * 0.55, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(x - r * 0.55, y - r * 0.95, r * 1.1, 4);

    // eye
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(x + r * 0.18, y - r * 0.62, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // health bar
    const hpw = r * 1.6;
    const hpx = x - hpw / 2;
    const hpy = y - r * 1.6;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(hpx - 1, hpy - 1, hpw + 2, 4);
    ctx.fillStyle = p.team === 'player' ? '#3ad14a' : '#e74c3c';
    ctx.fillRect(hpx, hpy, (hpw * p.health) / p.maxHealth, 2);

    // active indicator
    if (isActive) {
      ctx.strokeStyle = '#1f4d8e';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.ellipse(x, y + r + 4, r * 1.1, r * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  private drawSnowball(b: Snowball): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.arc(b.position.x + 2, b.position.y + 4, b.radius * 0.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(b.position.x, b.position.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a9c0d8';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private drawAim(game: Game, aim: AimState): void {
    const ctx = this.ctx;
    const a = game.activePlayer;
    if (!a) return;
    ctx.strokeStyle = `rgba(31, 77, 142, ${0.4 + aim.charge * 0.5})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(a.position.x, a.position.y);
    ctx.lineTo(aim.pointerX, aim.pointerY);
    ctx.stroke();
    ctx.setLineDash([]);

    // charge bar
    const barX = a.position.x - 16;
    const barY = a.position.y - a.radius * 2.4;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(barX - 1, barY - 1, 34, 5);
    ctx.fillStyle = '#1f4d8e';
    ctx.fillRect(barX, barY, 32 * aim.charge, 3);
  }

  private drawCenter(msg: string): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, WORLD_HEIGHT / 2 - 30, WORLD_WIDTH, 60);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Helvetica, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(msg, WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
  }
}
