import { test } from "node:test";
import assert from "node:assert/strict";
import { targetSize, providerSize } from "../src/lib/images.ts";
test("keeps every original dimension under 2K", () => {
  for (const [width, height] of [
    [731, 1097],
    [1, 1],
    [2048, 2047],
    [1920, 1080],
  ])
    assert.deepEqual(targetSize(width, height), { width, height });
});
test("caps the long edge and preserves aspect ratio", () => {
  assert.deepEqual(targetSize(6000, 4000), { width: 2048, height: 1365 });
  assert.deepEqual(targetSize(1000, 4000), { width: 512, height: 2048 });
  assert.throws(() => targetSize(0, 100));
});
test("provider dimensions comply with image API constraints", () => {
  for (const [w, h] of [
    [1, 1],
    [731, 1097],
    [2048, 2048],
    [2048, 200],
  ]) {
    const [a, b] = providerSize(w, h).split("x").map(Number);
    assert.equal(a % 16, 0);
    assert.equal(b % 16, 0);
    assert.ok(a * b >= 655360);
    assert.ok(a / b <= 3 && a / b >= 1 / 3);
  }
});
