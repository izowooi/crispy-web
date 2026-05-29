import { Vector2 } from './vector2';
import type { TeamId } from './types';

export const SNOWBALL_RADIUS = 5;

/** Maximum lifetime of a snowball before it dissolves (s). */
export const SNOWBALL_MAX_LIFETIME = 2.0;

/** Air drag (per second). 0 = none. small drag so charge matters. */
export const SNOWBALL_DRAG = 0.5;

export interface SnowballInit {
  position: Vector2;
  velocity: Vector2;
  ownerTeam: TeamId;
  ownerId: string;
  damage?: number;
}

export class Snowball {
  position: Vector2;
  velocity: Vector2;
  readonly ownerTeam: TeamId;
  readonly ownerId: string;
  readonly damage: number;
  age = 0;
  alive = true;

  constructor(init: SnowballInit) {
    this.position = init.position;
    this.velocity = init.velocity;
    this.ownerTeam = init.ownerTeam;
    this.ownerId = init.ownerId;
    this.damage = init.damage ?? 1;
  }

  get radius(): number {
    return SNOWBALL_RADIUS;
  }

  update(dt: number): void {
    if (!this.alive) return;
    this.age += dt;
    if (this.age >= SNOWBALL_MAX_LIFETIME) {
      this.alive = false;
      return;
    }
    // simple linear drag
    const dragFactor = Math.max(0, 1 - SNOWBALL_DRAG * dt);
    this.velocity = this.velocity.scale(dragFactor);
    this.position = this.position.add(this.velocity.scale(dt));
  }

  isOutOfBounds(width: number, height: number): boolean {
    return (
      this.position.x < -50 ||
      this.position.y < -50 ||
      this.position.x > width + 50 ||
      this.position.y > height + 50
    );
  }
}
