import type { ElementView } from "./types";

export const BASE_ELEMENTS: ElementView[] = [
  { name: "나무", emoji: "🌳", hanja: "木", base: true, desc: "뻗어 오르는 생명의 기운" },
  { name: "불", emoji: "🔥", hanja: "火", base: true, desc: "타오르며 위로 솟는 기운" },
  { name: "흙", emoji: "⛰️", hanja: "土", base: true, desc: "모든 것을 품고 길러내는 기운" },
  { name: "금속", emoji: "⚙️", hanja: "金", base: true, desc: "단단히 맺히고 갈무리하는 기운" },
  { name: "물", emoji: "💧", hanja: "水", base: true, desc: "낮은 곳으로 스며 흐르는 기운" },
];

export const BASE_NAMES = new Set(BASE_ELEMENTS.map((e) => e.name));

/** Commutative recipe key: 불+물 and 물+불 are the same recipe. */
export function pairKey(a: string, b: string): string {
  const [x, y] = [normalizeName(a), normalizeName(b)].sort();
  return `${x}+${y}`;
}

export function normalizeName(name: string): string {
  return name.normalize("NFC").trim().replace(/\s+/g, " ");
}
