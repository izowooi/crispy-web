import { describe, expect, it } from "vitest";
import { createRandomSelection, selectionToPrompt } from "@/lib/random-prompt";

describe("random prompt", () => {
  it("keeps locked slots and creates an editable full prompt", () => {
    const selection = createRandomSelection({ locked: { subject: "1boy", setting: "forest" } }, () => 0);
    expect(selection.subject).toEqual(["1boy"]);
    expect(selection.setting).toEqual(["forest"]);
    expect(selectionToPrompt(selection)).toContain("1boy");
    expect(selectionToPrompt(selection)).toContain("forest");
  });

  it("deduplicates repeated tags", () => {
    const selection = createRandomSelection({}, () => 0);
    const tags = selectionToPrompt(selection).split(", ");
    expect(new Set(tags).size).toBe(tags.length);
  });
});
