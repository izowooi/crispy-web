import { test } from "node:test";
import assert from "node:assert/strict";
import { estimateOutput, openaiOutputTokens } from "../src/lib/pricing.ts";
test("GPT Image 2.6 medium estimates match usage measured 2026-11-06", () => {
  assert.equal(openaiOutputTokens(1024, 1024), 1449);
  assert.equal(openaiOutputTokens(816, 816), 1268);
  assert.equal(openaiOutputTokens(1536, 1024), 1132);
  assert.equal(openaiOutputTokens(736, 1104), 895);
  assert.equal(openaiOutputTokens(2048, 2048), 2944);
  for (const model of ["flare", "sunburst"] as const) {
    assert.deepEqual(estimateOutput(320, 320, model, "1k"), {
      tokens: 1449,
      usd: 0.04347,
    });
    assert.deepEqual(estimateOutput(320, 320, model, "2k"), {
      tokens: 2944,
      usd: 0.08832,
    });
  }
});
test("Google estimates follow the actual API tier, including preserved large sources", () => {
  assert.deepEqual(estimateOutput(320, 320, "banana", "1k"), {
    tokens: 1120,
    usd: 0.0336,
  });
  assert.deepEqual(estimateOutput(320, 320, "banana", "2k"), {
    tokens: 1680,
    usd: 0.0504,
  });
  assert.deepEqual(estimateOutput(1500, 1000, "banana", "1k"), {
    tokens: 1680,
    usd: 0.0504,
  });
  assert.deepEqual(estimateOutput(320, 320, "banana", "original"), {
    tokens: 1120,
    usd: 0.0336,
  });
});
