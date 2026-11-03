import { test } from "node:test";
import assert from "node:assert/strict";
import {
  targetSize,
  providerSize,
  outputSize,
  generationPrompt,
} from "../src/lib/images.ts";
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

test("small-image enhancement defaults to a 1024px long edge, preserving aspect ratio", () => {
  assert.deepEqual(outputSize(320, 240), { width: 1024, height: 768 });
  assert.deepEqual(outputSize(400, 800), { width: 512, height: 1024 });
  assert.deepEqual(outputSize(512, 512), { width: 1024, height: 1024 });
  assert.deepEqual(outputSize(1, 100), { width: 10, height: 1024 });
});
test("enhancement preserves good sources and disabling preserves small dimensions", () => {
  for (const [w, h] of [
    [1024, 600],
    [731, 1097],
    [1920, 1080],
  ])
    assert.deepEqual(outputSize(w, h), { width: w, height: h });
  assert.deepEqual(outputSize(320, 240, false), { width: 320, height: 240 });
  for (const enabled of [true, false])
    assert.deepEqual(outputSize(6000, 4000, enabled), {
      width: 2048,
      height: 1365,
    });
  assert.match(generationPrompt(320, 240), /Reconstruct crisp/);
  assert.doesNotMatch(generationPrompt(320, 240, false), /Reconstruct crisp/);
  assert.doesNotMatch(generationPrompt(1024, 768), /Reconstruct crisp/);
});

test("three resolution modes use a minimum long edge without changing good sources", () => {
  assert.deepEqual(outputSize(320, 240, "original"), {
    width: 320,
    height: 240,
  });
  assert.deepEqual(outputSize(320, 240, "1k"), { width: 1024, height: 768 });
  assert.deepEqual(outputSize(320, 240, "2k"), { width: 2048, height: 1536 });
  assert.deepEqual(outputSize(1500, 1000, "1k"), { width: 1500, height: 1000 });
  assert.deepEqual(outputSize(1500, 1000, "2k"), { width: 2048, height: 1365 });
  for (const mode of ["original", "1k", "2k"] as const)
    assert.deepEqual(outputSize(4096, 3072, mode), {
      width: 2048,
      height: 1536,
    });
});
