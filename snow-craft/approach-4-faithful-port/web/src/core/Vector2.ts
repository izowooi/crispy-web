// Vector2 — port-introduced 2D math helper for the faithful Snowcraft port.
//
// The original AS2 source has NO Vector2 class. Gameplay code uses raw
// MovieClip `_x`/`_y` and parallel locals (e.g. `xmov`/`ymov`,
// `walkxmov`/`walkymov`). This helper consolidates those pair-arithmetic
// patterns into one type while preserving the *exact* arithmetic from the
// decompiled AS. Every operation is justified by a citation in the
// Vector2.test.ts companion file.

export class Vector2 {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    // SnowBall.as:39-40 — `ballmc._x = originalx = x; ballmc._y = originaly = y;`
    this.x = x;
    this.y = y;
  }

  /** (0, 0). Mirrors `walkendx = walkendy = 0` (RedSnowDudie.as:141). */
  static zero(): Vector2 {
    return new Vector2(0, 0);
  }

  /** Independent copy — used to snapshot positions before in-place updates. */
  clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  /** Component-wise equality. */
  equals(other: Vector2): boolean {
    return this.x === other.x && this.y === other.y;
  }

  /**
   * Non-destructive sum. `c = a.add(b)` ⇒ `c = (a.x+b.x, a.y+b.y)`.
   */
  add(other: Vector2): Vector2 {
    return new Vector2(this.x + other.x, this.y + other.y);
  }

  /**
   * In-place add. Mirrors SnowBall.as:130-131
   *   `this.ballmc._x += this.xmov; this.ballmc._y += this.ymov;`
   */
  addInPlace(other: Vector2): this {
    this.x += other.x;
    this.y += other.y;
    return this;
  }

  /**
   * Non-destructive difference. Mirrors RedSnowDudie.as:160-162 deltas
   *   `(walkendx - dudiemc._x, walkendy - dudiemc._y)`.
   */
  sub(other: Vector2): Vector2 {
    return new Vector2(this.x - other.x, this.y - other.y);
  }

  /** In-place subtract. */
  subInPlace(other: Vector2): this {
    this.x -= other.x;
    this.y -= other.y;
    return this;
  }

  /** Non-destructive scalar multiply. */
  scale(s: number): Vector2 {
    return new Vector2(this.x * s, this.y * s);
  }

  /** In-place scalar multiply. Mirrors `force *= 0.85` (SnowBall.as:99). */
  scaleInPlace(s: number): this {
    this.x *= s;
    this.y *= s;
    return this;
  }

  /**
   * Length / magnitude. Mirrors RedSnowDudie.as:160
   *   `Math.sqrt(Math.pow(walkendy - dudiemc._y,2) + Math.pow(walkendx - dudiemc._x,2))`.
   */
  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /** Squared length — handy for inner-loop comparisons (port-only optimisation). */
  lengthSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  /** Euclidean distance to another point. */
  distanceTo(other: Vector2): number {
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Unit vector (length 1) in the same direction. Returns (0,0) when called
   * on the zero vector to avoid NaN — the AS code never normalises a zero
   * vector because `if(this.walkendx)` (RedSnowDudie.as:156) gates the call,
   * so this branch is purely a port-side safety net.
   */
  normalize(): Vector2 {
    const len = this.length();
    if (len === 0) {
      return new Vector2(0, 0);
    }
    return new Vector2(this.x / len, this.y / len);
  }

  /**
   * Axis-aligned hit-box test (Chebyshev / "two independent abs checks").
   * Mirrors Snowcraft1Rewrite.as:366,376
   *   `Math.abs(ball._x - dudie._x) < 30
   *    && Math.abs(ball._y - (dudie._y - 20)) < 30`
   * The predicate uses strict `<`, so a delta exactly equal to halfW or
   * halfH does NOT register as a hit.
   */
  withinAabb(center: Vector2, halfW: number, halfH: number): boolean {
    return (
      Math.abs(this.x - center.x) < halfW &&
      Math.abs(this.y - center.y) < halfH
    );
  }

  /**
   * Inverse of the off-stage cull predicate at Snowcraft1Rewrite.as:384
   *   `if(Math.abs(_loc2_.ballmc._x) > 2999 || Math.abs(_loc2_.ballmc._y) > 2999) reap;`
   * Returns `true` when the point is still in-bounds (i.e. `|x| <= radius`
   * AND `|y| <= radius`). Inclusive boundary because the AS reaper triggers
   * on strict `>`.
   */
  withinChebyshev(radius: number): boolean {
    return Math.abs(this.x) <= radius && Math.abs(this.y) <= radius;
  }
}
