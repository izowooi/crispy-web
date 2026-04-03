import type { CharacterData, ParsedHtmlResult } from "./types";

export function parseCharacterHtml(htmlContent: string): ParsedHtmlResult {
  // CHARACTER_DATA is a single-line JSON object
  const dataMatch = htmlContent.match(
    /const\s+CHARACTER_DATA\s*=\s*(\{.+\})\s*;?\s*[\r\n]/
  );
  if (!dataMatch) {
    throw new Error("CHARACTER_DATA를 찾을 수 없습니다. 올바른 영웅 카드 HTML인지 확인해주세요.");
  }

  let characterData: CharacterData;
  try {
    characterData = JSON.parse(dataMatch[1]);
  } catch {
    throw new Error("CHARACTER_DATA JSON 파싱에 실패했습니다.");
  }

  // CHARACTER_IMAGES is an array of base64 data URLs (optional)
  const imagesMatch = htmlContent.match(
    /const\s+CHARACTER_IMAGES\s*=\s*(\[[\s\S]+?\])\s*;?\s*[\r\n]/
  );

  let portraitDataUrl: string | null = null;
  if (imagesMatch) {
    try {
      const images: string[] = JSON.parse(imagesMatch[1]);
      portraitDataUrl = images[0] ?? null;
    } catch {
      portraitDataUrl = null;
    }
  }

  return { characterData, portraitDataUrl };
}
