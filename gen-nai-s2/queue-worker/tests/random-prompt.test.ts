import { describe, expect, it } from "vitest";
import { randomPrompt } from "../src/random-prompt";

describe("bulk reroll prompt", () => {
  it("preserves locked slots and advanced additions", () => {
    const prompt = randomPrompt({ locked: { subject: "1boy" }, includeSensitive: false, includeArtist: false, extraPrompt: "dramatic shadows" }, () => 0);
    expect(prompt).toContain("1boy");
    expect(prompt).toContain("dramatic shadows");
  });
});
