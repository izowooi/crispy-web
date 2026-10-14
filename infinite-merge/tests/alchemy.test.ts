import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { pairKey } from "@/lib/elements";
import { BadOutputError, parseAlchemyOutput } from "@/lib/server/alchemy/parse";

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
    const { openDatabase, setDbForTests } = await import("@/lib/server/db");
    setDbForTests(openDatabase(":memory:"));
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

    expect(listUserElements("alice").map((e) => e.name)).toEqual(["증기"]);
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
});
