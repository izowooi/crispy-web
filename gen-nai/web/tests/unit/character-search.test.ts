import { describe, it, expect, beforeAll } from "vitest";
import { createCharacterSearcher } from "@/lib/character-search";
import type { CharacterRow } from "@/lib/types";

const sample: CharacterRow[] = [
  { work: "원신", kor: "호두", eng: "hu_tao_(genshin_impact)" },
  { work: "원신", kor: "감우", eng: "ganyu_(genshin_impact)" },
  { work: "원신", kor: "라이덴 쇼군", eng: "raiden_shogun" },
  { work: "장송의 프리렌", kor: "프리렌", eng: "frieren" },
  { work: "장송의 프리렌", kor: "페른", eng: "fern_(sousou_no_frieren)" },
  { work: "블루 아카이브", kor: "아루", eng: "aru_(blue_archive)" },
  { work: "보컬로이드", kor: "하츠네 미쿠", eng: "hatsune_miku" },
];

describe("createCharacterSearcher", () => {
  let searcher: ReturnType<typeof createCharacterSearcher>;
  beforeAll(() => {
    searcher = createCharacterSearcher(sample);
  });

  it("한글 캐릭터명으로 검색하면 해당 캐릭터가 상위에 나온다", () => {
    const results = searcher.search("프리렌");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].kor).toBe("프리렌");
    expect(results[0].eng).toBe("frieren");
  });

  it("영문 태그 일부로 검색하면 매칭된다", () => {
    const results = searcher.search("genshin");
    const matchedWorks = new Set(results.map((r) => r.work));
    expect(matchedWorks).toContain("원신");
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it("작품명으로 검색하면 그 작품의 캐릭터들이 묶여 나온다", () => {
    const results = searcher.search("프리렌");
    const worksOfTop = results.slice(0, 3).map((r) => r.work);
    expect(worksOfTop).toContain("장송의 프리렌");
  });

  it("빈 쿼리는 빈 결과를 반환한다", () => {
    expect(searcher.search("")).toEqual([]);
    expect(searcher.search("   ")).toEqual([]);
  });

  it("결과는 limit 옵션으로 제한할 수 있다 (기본 30)", () => {
    const many: CharacterRow[] = Array.from({ length: 100 }, (_, i) => ({
      work: "테스트",
      kor: `이름${i}`,
      eng: `name_${i}`,
    }));
    const s = createCharacterSearcher(many);
    expect(s.search("이름", { limit: 5 }).length).toBeLessThanOrEqual(5);
    expect(s.search("이름").length).toBeLessThanOrEqual(30);
  });

  it("음역 차이가 있어도(미쿠/Miku) 부분 매칭으로 찾는다", () => {
    const results = searcher.search("미쿠");
    expect(results.some((r) => r.eng === "hatsune_miku")).toBe(true);
  });
});
