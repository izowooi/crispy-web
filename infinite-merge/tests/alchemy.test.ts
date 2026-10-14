import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { pairKey } from "@/lib/elements";
import { BadOutputError, parseAlchemyOutput } from "@/lib/server/alchemy/parse";
import { createTestD1 } from "./support/d1";

describe("pairKey", () => {
  it("is commutative and normalizes whitespace", () => {
    expect(pairKey("불", "물")).toBe(pairKey("물", "불"));
    expect(pairKey("  불 ", "물")).toBe(pairKey("물", "불"));
    expect(pairKey("물", "물")).toBe("물+물");
  });
});

describe("parseAlchemyOutput", () => {
  it("parses a clean JSON line", () => {
    expect(parseAlchemyOutput('{"name":"증기","emoji":"♨️","desc":"하늘로 도망친 것"}')).toEqual({
      name: "증기",
      emoji: "♨️",
      desc: "하늘로 도망친 것",
    });
  });

  it("finds JSON inside chatter or code fences", () => {
    expect(parseAlchemyOutput('결과입니다:\n```json\n{"name": "진흙", "emoji": "🟫"}\n```').name).toBe("진흙");
  });

  it("handles braces inside strings", () => {
    expect(parseAlchemyOutput('{"name":"괄호","emoji":"🧩","desc":"{중괄호} 수집가"}').desc).toBe("{중괄호} 수집가");
  });

  it("cleans quotes, punctuation and stray emoji from the name", () => {
    expect(parseAlchemyOutput('{"name":"「용광로」!","emoji":"🌋"}').name).toBe("용광로");
    expect(parseAlchemyOutput('{"name":"🔥화염","emoji":"🔥"}').name).toBe("화염");
  });

  it("keeps a single grapheme emoji (incl. ZWJ / flags) and falls back to ✨", () => {
    expect(parseAlchemyOutput('{"name":"연금술사","emoji":"🧙‍♂️ 마법"}').emoji).toBe("🧙‍♂️");
    expect(parseAlchemyOutput('{"name":"한국","emoji":"🇰🇷"}').emoji).toBe("🇰🇷");
    expect(parseAlchemyOutput('{"name":"무언가","emoji":"없음"}').emoji).toBe("✨");
    expect(parseAlchemyOutput('{"name":"무언가"}').emoji).toBe("✨");
  });

  it("truncates long desc", () => {
    const desc = "가".repeat(80);
    expect([...parseAlchemyOutput(`{"name":"긴것","emoji":"📜","desc":"${desc}"}`).desc!].length).toBe(60);
  });

  it("rejects missing/empty/too-long names and non-JSON", () => {
    expect(() => parseAlchemyOutput("증기")).toThrow(BadOutputError);
    expect(() => parseAlchemyOutput('{"emoji":"🔥"}')).toThrow(BadOutputError);
    expect(() => parseAlchemyOutput('{"name":"  ","emoji":"🔥"}')).toThrow(BadOutputError);
    expect(() => parseAlchemyOutput(`{"name":"${"가".repeat(21)}","emoji":"🔥"}`)).toThrow(BadOutputError);
  });
});

describe("combine (mock provider, isolated DB)", () => {
  let tmp: string;
  let combine: typeof import("@/lib/server/alchemy/combine").combine;
  let listUserElements: typeof import("@/lib/server/alchemy/combine").listUserElements;
  let mockSpy: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "infinite-merge-test-"));
    process.env.INFINITE_MERGE_DATA_DIR = tmp;
    process.env.INFINITE_MERGE_AI = "mock";
    const real = await import("@/lib/server/alchemy/mock");
    mockSpy = vi.fn((a: string, b: string) => real.mockCombine(a, b, 0));
    vi.doMock("@/lib/server/alchemy/mock", () => ({ mockCombine: mockSpy }));
    ({ combine, listUserElements } = await import("@/lib/server/alchemy/combine"));
  });

  beforeEach(async () => {
    const { setDbForTests } = await import("@/lib/server/db");
    setDbForTests(createTestD1());
    mockSpy.mockClear();
  });

  afterAll(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
    delete process.env.INFINITE_MERGE_AI;
    delete process.env.INFINITE_MERGE_DATA_DIR;
  });

  it("creates a first discovery, then serves the recipe from cache", async () => {
    const first = await combine("alice", "불", "물");
    expect(first.result.name).toBe("증기");
    expect(first).toMatchObject({ isNew: true, isFirstDiscovery: true, cached: false, model: "mock" });
    expect(mockSpy).toHaveBeenCalledTimes(1);

    const again = await combine("bob", "물", "불");
    expect(again).toMatchObject({ isNew: true, isFirstDiscovery: false, cached: true });
    expect(again.result.firstDiscovery).toBe(false);
    expect(mockSpy).toHaveBeenCalledTimes(1);

    const repeat = await combine("alice", "불", "물");
    expect(repeat).toMatchObject({ isNew: false, isFirstDiscovery: false, cached: true });
    expect(repeat.result.firstDiscovery).toBe(true);

    expect((await listUserElements("alice")).map((e) => e.name)).toEqual(["증기"]);
  });

  it("rejects elements the user hasn't discovered", async () => {
    await expect(combine("alice", "증기", "불")).rejects.toMatchObject({ code: "unknown_element" });
    await combine("alice", "불", "물");
    await expect(combine("alice", "증기", "불")).resolves.toMatchObject({ cached: false });
  });

  it("coalesces concurrent identical requests into one generation", async () => {
    const [x, y] = await Promise.all([combine("alice", "흙", "물"), combine("alice", "물", "흙")]);
    expect(mockSpy).toHaveBeenCalledTimes(1);
    expect(x.result.name).toBe(y.result.name);
    expect([x.isNew, y.isNew].sort()).toEqual([false, true]);
  });
  it("bumps the world counter only for brand-new elements", async () => {
    const { worldCount } = await import("@/lib/server/alchemy/combine");
    expect(await worldCount()).toBe(5);
    await combine("alice", "불", "물");
    await combine("bob", "물", "불");
    expect(await worldCount()).toBe(6);
  });

  it("keeps the shared recipe when another isolate already recorded the pair", async () => {
    const { getDb } = await import("@/lib/server/db");
    // Simulate a concurrent writer: the pair is recorded with a different result just before ours lands.
    mockSpy.mockImplementationOnce(async () => {
      const db = getDb();
      await db.batch([
        db.prepare("INSERT INTO im_elements (name, emoji, desc, created_at, first_by_sub) VALUES ('안개', '🌫️', NULL, 1, 'carol')"),
        db.prepare("INSERT INTO im_recipes (pair_key, a, b, result_name, model, created_at, created_by_sub) VALUES ('물+불', '물', '불', '안개', 'other', 1, 'carol')"),
      ]);
      return { name: "증기", emoji: "♨️", desc: "x" };
    });
    const res = await combine("alice", "불", "물");
    expect(res.result.name).toBe("안개");
    expect(res).toMatchObject({ isFirstDiscovery: false, isNew: true, model: "other" });
  });

  it("resetProgress clears only that player's collection", async () => {
    const { resetProgress } = await import("@/lib/server/alchemy/combine");
    await combine("alice", "불", "물");
    await combine("bob", "불", "물");
    await resetProgress("alice");
    expect(await listUserElements("alice")).toEqual([]);
    expect((await listUserElements("bob")).map((e) => e.name)).toEqual(["증기"]);
  });
});
