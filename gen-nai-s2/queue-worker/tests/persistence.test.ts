import { describe, expect, it } from "vitest";
import { normalizePrompt, promptId, splitTags, textHash } from "../src/persistence";

describe("prompt persistence identity", () => {
  it("normalizes spacing, case and underscores for exact lookup", async () => {
    expect(normalizePrompt(" 1GIRL, blue_hair  ")).toBe("1girl, blue hair");
    await expect(promptId("1GIRL, blue_hair", "LOWRES")).resolves.toBe(await promptId("1girl, blue hair", "lowres"));
    await expect(textHash(normalizePrompt("1GIRL, blue_hair"))).resolves.toBe(await textHash(normalizePrompt("1girl, blue hair")));
  });
  it("stores individual tags for future lookup", () => expect(splitTags("1girl, blue_hair")).toEqual(["1girl", "blue hair"]));
});
