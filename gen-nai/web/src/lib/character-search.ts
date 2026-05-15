/**
 * 캐릭터 검색기 — Fuse.js 기반.
 * 한글명·영문 태그·작품명 3개 키로 부분 매칭, 작품명 가중치 낮음(같은 작품 안에서 묶여 나오게).
 */
import Fuse from "fuse.js";
import type { CharacterRow } from "./types";

export type SearchOptions = {
  limit?: number;
};

const DEFAULT_LIMIT = 30;

export function createCharacterSearcher(rows: CharacterRow[]) {
  const fuse = new Fuse(rows, {
    keys: [
      { name: "kor", weight: 0.5 },
      { name: "eng", weight: 0.4 },
      { name: "work", weight: 0.1 },
    ],
    threshold: 0.4,
    ignoreLocation: true,
    includeScore: true,
    minMatchCharLength: 1,
  });

  return {
    search(query: string, options: SearchOptions = {}): CharacterRow[] {
      const q = query.trim();
      if (q.length === 0) return [];
      const limit = options.limit ?? DEFAULT_LIMIT;
      return fuse.search(q, { limit }).map((r) => r.item);
    },
    size(): number {
      return rows.length;
    },
  };
}
