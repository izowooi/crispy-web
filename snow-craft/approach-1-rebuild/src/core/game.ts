import { Vector2 } from './vector2';
import { Player } from './player';
import { Snowball } from './snowball';
import { levelConfig, MAX_LEVEL, type TeamColor } from './types';

export const WORLD_WIDTH = 800;
export const WORLD_HEIGHT = 500;

/** Number of player-controlled kids (per the README "3 kids"). */
export const PLAYER_TEAM_SIZE = 3;

export const PLAYER_BASE_HEALTH = 5;

/** Maximum simultaneous CPU characters on screen for performance. */
export const MAX_CPU_ON_SCREEN = 60;

/** Throw speed (px/s) at minimum charge. */
export const MIN_THROW_SPEED = 280;
/** Throw speed (px/s) at full charge. */
export const MAX_THROW_SPEED = 600;
/** Time (s) to fully charge a throw. */
export const FULL_CHARGE_TIME = 1.0;

export type GamePhase = 'idle' | 'playing' | 'level-clear' | 'game-over' | 'victory';

export interface GameEvents {
  onSnowballThrown?: (ball: Snowball) => void;
  onSnowballHit?: (ball: Snowball, target: Player) => void;
  onPlayerKO?: (player: Player) => void;
  onLevelClear?: (level: number) => void;
  onGameOver?: () => void;
  onVictory?: () => void;
}

export interface GameInitOptions {
  startingLevel?: number;
  playerColor?: TeamColor;
  cpuColor?: TeamColor;
  events?: GameEvents;
  rng?: () => number;
}

/**
 * Pure game-state class. No DOM or canvas dependencies — fully testable.
 */
export class Game {
  level: number;
  phase: GamePhase = 'idle';
  score = 0;

  playerColor: TeamColor;
  cpuColor: TeamColor;

  players: Player[] = [];
  cpus: Player[] = [];
  snowballs: Snowball[] = [];

  /** index into players[] of the active controlled kid. */
  activePlayerIndex = 0;

  /** total enemies remaining for current level (across waves). */
  enemiesRemaining = 0;

  private nextId = 1;
  private events: GameEvents;
  private rng: () => number;

  constructor(opts: GameInitOptions = {}) {
    this.level = opts.startingLevel ?? 1;
    this.playerColor = opts.playerColor ?? 'green';
    this.cpuColor = opts.cpuColor ?? 'red';
    this.events = opts.events ?? {};
    this.rng = opts.rng ?? Math.random;
  }

  startLevel(level = this.level): void {
    this.level = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));
    const cfg = levelConfig(this.level);
    this.snowballs = [];
    this.players = this.createPlayers();
    this.cpus = [];
    this.enemiesRemaining = cfg.cpuCount;
    this.activePlayerIndex = 0;
    this.spawnInitialCPUs();
    this.phase = 'playing';
  }

  private createPlayers(): Player[] {
    const list: Player[] = [];
    const xs = [60, 60, 60];
    const ys = [WORLD_HEIGHT * 0.3, WORLD_HEIGHT * 0.5, WORLD_HEIGHT * 0.7];
    for (let i = 0; i < PLAYER_TEAM_SIZE; i++) {
      list.push(
        new Player({
          id: `player-${i}`,
          team: 'player',
          color: this.playerColor,
          position: new Vector2(xs[i], ys[i]),
          maxHealth: PLAYER_BASE_HEALTH,
        }),
      );
    }
    return list;
  }

  private spawnInitialCPUs(): void {
    const cfg = levelConfig(this.level);
    const initialCount = Math.min(cfg.cpuCount, MAX_CPU_ON_SCREEN);
    for (let i = 0; i < initialCount; i++) {
      this.cpus.push(this.createCPU(cfg.cpuHealth));
    }
  }

  private createCPU(health: number): Player {
    const id = `cpu-${this.nextId++}`;
    const x = WORLD_WIDTH * 0.65 + this.rng() * (WORLD_WIDTH * 0.3);
    const y = WORLD_HEIGHT * 0.15 + this.rng() * (WORLD_HEIGHT * 0.7);
    return new Player({
      id,
      team: 'cpu',
      color: this.cpuColor,
      position: new Vector2(x, y),
      maxHealth: health,
    });
  }

  /** Active controlled player (alive). */
  get activePlayer(): Player | null {
    if (this.players.length === 0) return null;
    let idx = this.activePlayerIndex;
    for (let i = 0; i < this.players.length; i++) {
      const p = this.players[(idx + i) % this.players.length];
      if (p.isAlive) {
        this.activePlayerIndex = (idx + i) % this.players.length;
        return p;
      }
    }
    return null;
  }

  cycleActivePlayer(): void {
    if (this.players.length === 0) return;
    for (let i = 1; i <= this.players.length; i++) {
      const idx = (this.activePlayerIndex + i) % this.players.length;
      if (this.players[idx].isAlive) {
        this.activePlayerIndex = idx;
        return;
      }
    }
  }

  /**
   * Throw from given thrower toward target with charge in [0,1].
   * Returns the spawned snowball or null if thrower can't throw.
   */
  throwFrom(thrower: Player, target: Vector2, charge: number): Snowball | null {
    if (!thrower.canThrow()) return null;
    const dir = target.sub(thrower.position).normalized();
    if (dir.length() === 0) return null;
    const speed = MIN_THROW_SPEED + (MAX_THROW_SPEED - MIN_THROW_SPEED) * Math.max(0, Math.min(1, charge));
    const startOffset = dir.scale(thrower.radius + 4);
    const ball = new Snowball({
      position: thrower.position.add(startOffset),
      velocity: dir.scale(speed),
      ownerTeam: thrower.team,
      ownerId: thrower.id,
      damage: 1,
    });
    thrower.registerThrow();
    thrower.setFacingTowards(target);
    this.snowballs.push(ball);
    this.events.onSnowballThrown?.(ball);
    return ball;
  }

  /** Sugar: throw from active player. */
  throwFromActive(target: Vector2, charge: number): Snowball | null {
    const a = this.activePlayer;
    if (!a) return null;
    return this.throwFrom(a, target, charge);
  }

  /** Step the simulation. dt in seconds. */
  update(dt: number): void {
    if (this.phase !== 'playing') return;

    // Player movement / cooldown
    for (const p of this.players) {
      p.update(dt);
      p.clampToBounds(WORLD_WIDTH, WORLD_HEIGHT);
    }

    // CPU AI + movement
    for (const c of this.cpus) {
      this.runCpuAi(c, dt);
      c.update(dt);
      c.clampToBounds(WORLD_WIDTH, WORLD_HEIGHT);
    }

    // Snowballs
    for (const ball of this.snowballs) {
      ball.update(dt);
      if (!ball.alive) continue;
      if (ball.isOutOfBounds(WORLD_WIDTH, WORLD_HEIGHT)) {
        ball.alive = false;
        continue;
      }
      this.checkSnowballHits(ball);
    }
    this.snowballs = this.snowballs.filter((b) => b.alive);

    // Spawn replacements if waves remain (queue up to MAX_CPU_ON_SCREEN)
    this.maybeSpawnMoreCPUs();

    // Phase transitions
    this.checkLevelTransition();
  }

  private runCpuAi(cpu: Player, dt: number): void {
    if (!cpu.isAlive) return;
    const cfg = levelConfig(this.level);
    const target = this.findClosestPlayer(cpu);
    if (!target) {
      cpu.velocity = Vector2.zero();
      return;
    }
    cpu.setFacingTowards(target.position);

    const dist = Vector2.distance(cpu.position, target.position);
    const desiredDist = 240; // try to keep at this distance
    const dir = target.position.sub(cpu.position).normalized();

    // base movement: approach if too far, retreat if too close.
    const speedBase = 30 + Math.min(80, cfg.cpuDifficulty * 6);
    if (dist > desiredDist + 30) {
      cpu.velocity = dir.scale(speedBase);
    } else if (dist < desiredDist - 60) {
      cpu.velocity = dir.scale(-speedBase * 0.7);
    } else {
      // strafe
      const strafe = new Vector2(-dir.y, dir.x).scale(speedBase * 0.5 * (this.rng() < 0.5 ? -1 : 1));
      cpu.velocity = strafe;
    }

    // Throw decision
    if (cpu.canThrow()) {
      // probability per second scales with difficulty (cap at ~3 throws/sec at high diff)
      const throwsPerSec = 0.3 + Math.min(2.5, cfg.cpuDifficulty * 0.08);
      if (this.rng() < throwsPerSec * dt) {
        // accuracy: jitter target by amount inversely proportional to difficulty
        const jitter = Math.max(8, 80 - cfg.cpuDifficulty * 4);
        const aim = target.position.add(
          new Vector2((this.rng() - 0.5) * jitter * 2, (this.rng() - 0.5) * jitter * 2),
        );
        const charge = 0.4 + this.rng() * 0.5;
        this.throwFrom(cpu, aim, charge);
      }
    }
  }

  private findClosestPlayer(from: Player): Player | null {
    let best: Player | null = null;
    let bestDist = Infinity;
    for (const p of this.players) {
      if (!p.isAlive) continue;
      const d = Vector2.distance(from.position, p.position);
      if (d < bestDist) {
        best = p;
        bestDist = d;
      }
    }
    return best;
  }

  private checkSnowballHits(ball: Snowball): void {
    const targets = ball.ownerTeam === 'player' ? this.cpus : this.players;
    for (const t of targets) {
      if (!t.isAlive) continue;
      const r = t.radius + ball.radius;
      if (Vector2.distance(ball.position, t.position) <= r) {
        t.takeDamage(ball.damage);
        ball.alive = false;
        this.events.onSnowballHit?.(ball, t);
        if (!t.isAlive) {
          this.events.onPlayerKO?.(t);
          if (t.team === 'cpu') {
            this.score += 10 * this.level;
            this.enemiesRemaining = Math.max(0, this.enemiesRemaining - 1);
          }
        }
        break;
      }
    }
  }

  private maybeSpawnMoreCPUs(): void {
    const cfg = levelConfig(this.level);
    const aliveCount = this.cpus.filter((c) => c.isAlive).length;
    const queued = this.enemiesRemaining - aliveCount;
    if (queued <= 0) return;
    const cap = Math.min(MAX_CPU_ON_SCREEN, cfg.cpuCount);
    while (this.cpus.filter((c) => c.isAlive).length < cap && this.totalCpusEverSpawned() < this.enemiesRemaining + this.cpusKnockedOut()) {
      this.cpus.push(this.createCPU(cfg.cpuHealth));
      // safety break
      if (this.cpus.length > cfg.cpuCount + 5) break;
    }
  }

  private totalCpusEverSpawned(): number {
    return this.cpus.length;
  }

  private cpusKnockedOut(): number {
    return this.cpus.filter((c) => !c.isAlive).length;
  }

  private checkLevelTransition(): void {
    const playerAlive = this.players.some((p) => p.isAlive);
    if (!playerAlive) {
      this.phase = 'game-over';
      this.events.onGameOver?.();
      return;
    }
    if (this.enemiesRemaining <= 0 && this.cpus.every((c) => !c.isAlive)) {
      if (this.level >= MAX_LEVEL) {
        this.phase = 'victory';
        this.events.onVictory?.();
      } else {
        this.phase = 'level-clear';
        this.events.onLevelClear?.(this.level);
      }
    }
  }

  /** Advance to the next level after a level-clear. */
  advanceLevel(): void {
    if (this.phase !== 'level-clear') return;
    this.startLevel(this.level + 1);
  }

  reset(): void {
    this.level = 1;
    this.score = 0;
    this.snowballs = [];
    this.players = [];
    this.cpus = [];
    this.phase = 'idle';
  }
}
