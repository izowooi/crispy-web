/**
 * 2D vector. Immutable-style API: each operation returns a new Vector2.
 */
export class Vector2 {
  constructor(public readonly x: number, public readonly y: number) {}

  add(other: Vector2): Vector2 {
    return new Vector2(this.x + other.x, this.y + other.y);
  }

  sub(other: Vector2): Vector2 {
    return new Vector2(this.x - other.x, this.y - other.y);
  }

  scale(s: number): Vector2 {
    return new Vector2(this.x * s, this.y * s);
  }

  length(): number {
    return Math.hypot(this.x, this.y);
  }

  normalized(): Vector2 {
    const len = this.length();
    if (len === 0) return new Vector2(0, 0);
    return new Vector2(this.x / len, this.y / len);
  }

  clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  static distance(a: Vector2, b: Vector2): number {
    return a.sub(b).length();
  }

  static zero(): Vector2 {
    return new Vector2(0, 0);
  }
}
