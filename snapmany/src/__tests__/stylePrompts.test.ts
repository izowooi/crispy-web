import { describe, it, expect } from "vitest";
import { STYLES, STYLE_IDS } from "@/config/styles";
import { STYLE_PROMPTS, getStylePrompt } from "@/lib/stylePrompts";

describe("lib/stylePrompts — server-only style prompts", () => {
  it("has a prompt entry for every known styleId", () => {
    for (const id of STYLE_IDS) {
      const entry = STYLE_PROMPTS[id];
      expect(entry, `STYLE_PROMPTS missing entry for "${id}"`).toBeDefined();
      expect(typeof entry.prompt).toBe("string");
      expect(entry.prompt.length).toBeGreaterThan(10);
    }
  });

  it("does not contain extra ids beyond the declared 15 styles", () => {
    const promptKeys = new Set(Object.keys(STYLE_PROMPTS));
    const styleIdSet = new Set(STYLE_IDS);
    expect(promptKeys.size).toBe(styleIdSet.size);
    for (const k of promptKeys) {
      expect(styleIdSet.has(k)).toBe(true);
    }
  });

  describe("getStylePrompt", () => {
    it("returns the prompt object for every known styleId", () => {
      for (const id of STYLE_IDS) {
        const result = getStylePrompt(id);
        expect(result).not.toBeNull();
        expect(result?.prompt.length).toBeGreaterThan(10);
      }
    });

    it("returns null for an unknown styleId", () => {
      expect(getStylePrompt("nonexistent_style_xyz")).toBeNull();
      expect(getStylePrompt("")).toBeNull();
    });
  });

  it("no prompt accidentally contains secret-looking tokens", () => {
    // sanity check: no prompt should embed token-like strings
    const tokenPatterns = [/r8_[A-Za-z0-9]{20,}/, /AIza[A-Za-z0-9_-]{30,}/, /sk-[A-Za-z0-9]{20,}/];
    for (const id of STYLE_IDS) {
      const entry = STYLE_PROMPTS[id];
      for (const p of tokenPatterns) {
        expect(entry.prompt, `prompt "${id}" must not contain a secret-looking token`).not.toMatch(p);
      }
    }
  });

  it("every prompt mentions identity-preservation guard (subject/identity/composition)", () => {
    // gpt-image-2가 인물을 임의로 바꾸지 않도록 가드 문장이 들어 있어야 함
    for (const id of STYLE_IDS) {
      const entry = STYLE_PROMPTS[id];
      const text = entry.prompt.toLowerCase();
      const hasGuard =
        text.includes("identity") ||
        text.includes("preserve") ||
        text.includes("maintain");
      expect(hasGuard, `prompt "${id}" should include an identity-preservation guard`).toBe(true);
    }
  });

  it("each prompt entry, when set, declares a valid aspectRatio", () => {
    const allowed = new Set(["1:1", "2:3", "3:2"]);
    for (const id of STYLE_IDS) {
      const entry = STYLE_PROMPTS[id];
      if (entry.aspectRatio !== undefined) {
        expect(allowed.has(entry.aspectRatio)).toBe(true);
      }
    }
  });

  it("ids in STYLE_PROMPTS form a 1:1 mapping with config/styles ids", () => {
    const promptKeys = new Set(Object.keys(STYLE_PROMPTS));
    const styleIds = new Set(STYLES.map((s) => s.id));
    expect(promptKeys).toEqual(styleIds);
  });
});
