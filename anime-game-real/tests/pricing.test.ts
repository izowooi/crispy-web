import { test } from "node:test";
import assert from "node:assert/strict";
import { estimateOutput, openaiOutputTokens } from "../src/lib/pricing.ts";
test("OpenAI medium estimates match the official calculator checked 2026-11-03", () => {
  assert.equal(openaiOutputTokens(1024, 1024), 439);
  assert.equal(openaiOutputTokens(2048, 2048), 892);
  for (const model of ["flare", "sunburst"] as const) {
    assert.deepEqual(estimateOutput(320, 320, model, "1k"), {
      tokens: 439,
      usd: 0.01317,
    });
    assert.deepEqual(estimateOutput(320, 320, model, "2k"), {
      tokens: 892,
      usd: 0.02676,
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
