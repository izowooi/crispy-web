import { describe, it, expect } from 'vitest';
import { Vector2 } from '../../src/core/vector2';

describe('Vector2', () => {
  it('creates with x,y', () => {
    const v = new Vector2(3, 4);
    expect(v.x).toBe(3);
    expect(v.y).toBe(4);
  });

  it('adds two vectors', () => {
    const r = new Vector2(1, 2).add(new Vector2(3, 4));
    expect(r.x).toBe(4);
    expect(r.y).toBe(6);
  });

  it('subtracts two vectors', () => {
    const r = new Vector2(5, 7).sub(new Vector2(2, 3));
    expect(r.x).toBe(3);
    expect(r.y).toBe(4);
  });

  it('scales a vector', () => {
    const r = new Vector2(3, -2).scale(2);
    expect(r.x).toBe(6);
    expect(r.y).toBe(-4);
  });

  it('computes length', () => {
    expect(new Vector2(3, 4).length()).toBeCloseTo(5);
  });

  it('normalizes a vector', () => {
    const n = new Vector2(0, 5).normalized();
    expect(n.x).toBeCloseTo(0);
    expect(n.y).toBeCloseTo(1);
  });

  it('returns zero vector when normalizing zero', () => {
    const n = new Vector2(0, 0).normalized();
    expect(n.x).toBe(0);
    expect(n.y).toBe(0);
  });

  it('computes distance', () => {
    expect(Vector2.distance(new Vector2(0, 0), new Vector2(3, 4))).toBeCloseTo(5);
  });

  it('clones a vector', () => {
    const a = new Vector2(1, 2);
    const b = a.clone();
    expect(b).not.toBe(a);
    expect(b.x).toBe(1);
    expect(b.y).toBe(2);
  });
});
