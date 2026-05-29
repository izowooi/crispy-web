import { Vector2 } from './vector2';
import type { TeamColor, TeamId } from './types';

export const PLAYER_RADIUS = 14;

/** Cooldown (s) between throws. */
export const PLAYER_THROW_COOLDOWN = 0.6;

/** Time it takes to "build up" a fresh snowball before throwing again. */
export const PLAYER_RELOAD_TIME = 0.3;

export interface PlayerInit {
  id: string;
  team: TeamId;
  color: TeamColor;
  position: Vector2;
  maxHealth: number;
}

export class Player {
  readonly id: string;
  readonly team: TeamId;
  color: TeamColor;
  position: Vector2;
  velocity: Vector2 = Vector2.zero();
  readonly maxHealth: number;
  health: number;
  /** seconds remaining until next throw is allowed. */
  cooldown = 0;
  /** facing direction in radians, 0 = +x. used for animation only. */
  facing = 0;

  constructor(init: PlayerInit) {
    this.id = init.id;
    this.team = init.team;
    this.color = init.color;
    this.position = init.position;
    this.maxHealth = Math.max(1, Math.floor(init.maxHealth));
    this.health = this.maxHealth;
  }

  get isAlive(): boolean {
    return this.health > 0;
  }

  get radius(): number {
    return PLAYER_RADIUS;
  }

  takeDamage(amount = 1): void {
    if (!this.isAlive) return;
    this.health = Math.max(0, this.health - amount);
  }

  canThrow(): boolean {
    return this.isAlive && this.cooldown <= 0;
  }

  /** Mark a throw and start cooldown. */
  registerThrow(): void {
    this.cooldown = PLAYER_THROW_COOLDOWN + PLAYER_RELOAD_TIME;
  }

  update(dt: number): void {
    if (!this.isAlive) {
      this.velocity = Vector2.zero();
      return;
    }
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.position = this.position.add(this.velocity.scale(dt));
  }

  setFacingTowards(target: Vector2): void {
    const diff = target.sub(this.position);
    if (diff.length() === 0) return;
    this.facing = Math.atan2(diff.y, diff.x);
  }

  clampToBounds(width: number, height: number): void {
    const r = this.radius;
    const x = Math.max(r, Math.min(width - r, this.position.x));
    const y = Math.max(r, Math.min(height - r, this.position.y));
    this.position = new Vector2(x, y);
  }
}
