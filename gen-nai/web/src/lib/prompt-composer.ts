/**
 * 최종 NAI 프롬프트 조립 — 순수 함수, 단위 테스트 친화.
 * 출력 순서: [작가(가중치)], [캐릭터], [1girl/1boy], [퀄리티 본문]
 *
 * 작가 토큰 포맷: "<weight>::artist:<name>::"
 *  - 가중치 1 도 명시 (일관성)
 *  - name 은 Danbooru 표기 그대로 (예: "mika_pikazo", "wagashi_(dagashiya)")
 *  - 가중치 0 은 제외
 */
import type { ArtistSelection, CharacterRow } from "./types";

export type ComposeInput = {
  artists: ArtistSelection[];
  characters: CharacterRow[];
  subject: "1girl" | "1boy";
  qualityBody: string;
};

export function formatWeight(w: number): string {
  if (!Number.isFinite(w)) return "1";
  if (Number.isInteger(w)) return String(w);
  // 1.50000 → "1.5", 0.300 → "0.3"
  return w
    .toFixed(2)
    .replace(/0+$/, "")
    .replace(/\.$/, "");
}

export function buildArtistSegment(selections: ArtistSelection[]): string {
  return selections
    .filter((s) => s.weight !== 0 && s.name.trim() !== "")
    .map((s) => `${formatWeight(s.weight)}::artist:${s.name}::`)
    .join(", ");
}

export function composeFinalPrompt(input: ComposeInput): string {
  const parts: string[] = [];
  const artistSeg = buildArtistSegment(input.artists);
  if (artistSeg) parts.push(artistSeg);

  const charSeg = input.characters
    .map((c) => c.eng.trim())
    .filter(Boolean)
    .join(", ");
  if (charSeg) parts.push(charSeg);

  parts.push(input.subject);

  const q = input.qualityBody.trim();
  if (q) parts.push(q);

  return parts.join(", ");
}
