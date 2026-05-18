/**
 * 최종 NAI 프롬프트 조립 — 순수 함수, 단위 테스트 친화.
 *
 * 출력 순서 (NAI v4.5 커뮤니티 + 분석 데이터 기준):
 *   [subject (1girl, solo)] , [characters] , [artists 가중치] , [quality body]
 *
 * 근거: 사용자 제공 79개 인기 스타일 + 사용자 본인 예시 프롬프트들에서
 *   '1girl, solo, ...' 로 subject 가 맨 앞에 오고, 캐릭터·작가는 그 뒤에 오는
 *   패턴이 일관됨. NAI 4.5 는 위치 영향력이 v3 보다 약하지만 여전히 토큰 순서가
 *   결과에 영향을 줌.
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

  // 1) subject — "1girl, solo" 또는 "1boy, solo" (인물 수 잠금)
  parts.push(`${input.subject}, solo`);

  // 2) characters — Danbooru 태그 그대로
  const charSeg = input.characters
    .map((c) => c.eng.trim())
    .filter(Boolean)
    .join(", ");
  if (charSeg) parts.push(charSeg);

  // 3) artists with weights
  const artistSeg = buildArtistSegment(input.artists);
  if (artistSeg) parts.push(artistSeg);

  // 4) quality body (사용자 편집 가능 영역)
  const q = input.qualityBody.trim();
  if (q) parts.push(q);

  return parts.join(", ");
}
