import { describe, it, expect } from "vitest";
import {
  STYLES,
  CATEGORIES,
  STYLE_IDS,
  isKnownStyleId,
  getStylesByCategory,
  type StyleMeta,
  type StyleCategoryId,
} from "@/config/styles";

describe("config/styles — client-exposed metadata", () => {
  it("exposes exactly 15 styles", () => {
    expect(STYLES.length).toBe(15);
  });

  it("exposes exactly 7 categories", () => {
    expect(CATEGORIES.length).toBe(7);
  });

  it("every style has required fields (id, label, category, description) and no prompt", () => {
    for (const s of STYLES) {
      expect(typeof s.id).toBe("string");
      expect(s.id.length).toBeGreaterThan(0);
      expect(typeof s.label).toBe("string");
      expect(s.label.length).toBeGreaterThan(0);
      expect(typeof s.category).toBe("string");
      expect(s.category.length).toBeGreaterThan(0);
      expect(typeof s.description).toBe("string");
      expect(s.description.length).toBeGreaterThan(0);
      // 보안: prompt가 클라이언트 메타에 새지 않았음을 확인
      expect(Object.keys(s)).not.toContain("prompt");
      expect(Object.keys(s)).not.toContain("negativePrompt");
    }
  });

  it("style ids are unique", () => {
    const set = new Set(STYLE_IDS);
    expect(set.size).toBe(STYLES.length);
  });

  it("every style's category is one of the declared CATEGORIES", () => {
    const categoryIdSet = new Set(CATEGORIES.map((c) => c.id));
    for (const s of STYLES) {
      expect(categoryIdSet.has(s.category)).toBe(true);
    }
  });

  it("every declared category is used by at least one style", () => {
    const usedCategorySet = new Set<StyleCategoryId>(STYLES.map((s) => s.category));
    for (const c of CATEGORIES) {
      expect(usedCategorySet.has(c.id)).toBe(true);
    }
  });

  it("STYLE_IDS matches STYLES order and content", () => {
    expect(STYLE_IDS).toEqual(STYLES.map((s) => s.id));
  });

  describe("isKnownStyleId", () => {
    it("returns true for every known style id", () => {
      for (const id of STYLE_IDS) {
        expect(isKnownStyleId(id)).toBe(true);
      }
    });

    it("returns false for an unknown style id", () => {
      expect(isKnownStyleId("nonexistent_style_xyz")).toBe(false);
      expect(isKnownStyleId("")).toBe(false);
    });
  });

  describe("getStylesByCategory", () => {
    it("returns only styles in the given category", () => {
      for (const c of CATEGORIES) {
        const matched = getStylesByCategory(c.id);
        expect(matched.length).toBeGreaterThan(0);
        for (const s of matched) {
          expect(s.category).toBe(c.id);
        }
      }
    });

    it("returns empty array for an unknown category", () => {
      // @ts-expect-error — intentional misuse for runtime guarantee
      const result = getStylesByCategory("not_a_category");
      expect(result).toEqual([]);
    });

    it("partition is complete: sum of category buckets equals total styles", () => {
      let total = 0;
      for (const c of CATEGORIES) {
        total += getStylesByCategory(c.id).length;
      }
      expect(total).toBe(STYLES.length);
    });
  });

  it("StyleMeta type can be used as a structural shape (compile-time check)", () => {
    const sample: StyleMeta = STYLES[0];
    expect(sample.id).toBe(STYLES[0].id);
  });
});
