import { describe, expect, it } from "vitest";
import { searchCompactTags, type CompactTag } from "@/lib/tag-search";

const tags: CompactTag[] = [
  ["blue eyes", 1000, 0], ["blue hair", 900, 0], ["dark blue hair", 800, 0], ["light blue eyes", 700, 0],
];

describe("searchCompactTags", () => {
  it("requires two characters", () => expect(searchCompactTags(tags, "b")).toEqual([]));
  it("normalizes underscores and keeps prefix before substring", () => {
    expect(searchCompactTags(tags, "blue_eye", 3).map((row) => row[0])).toEqual(["blue eyes", "light blue eyes"]);
  });
  it("honors the limit", () => expect(searchCompactTags(tags, "blue", 2)).toHaveLength(2));
});
