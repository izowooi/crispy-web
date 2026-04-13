import type { CharacterData, ParsedHtmlResult } from "./types";

/**
 * Extracts a balanced JSON block (object or array) starting at fromIndex.
 * Correctly handles nested brackets and quoted strings.
 */
function extractJsonBlock(
  text: string,
  openChar: string,
  closeChar: string,
  fromIndex: number
): string | null {
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = fromIndex; i < text.length; i++) {
    const c = text[i];
    if (escape) { escape = false; continue; }
    if (c === "\\" && inString) { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === openChar) depth++;
    else if (c === closeChar) {
      depth--;
      if (depth === 0) return text.slice(fromIndex, i + 1);
    }
  }
  return null;
}

export function parseCharacterHtml(htmlContent: string): ParsedHtmlResult {
  // Find `const CHARACTER_DATA = {` in either single-line or multi-line form
  const dataKeyMatch = htmlContent.match(/const\s+CHARACTER_DATA\s*=\s*(?=\{)/);
  if (!dataKeyMatch || dataKeyMatch.index === undefined) {
    throw new Error(
      "CHARACTER_DATA를 찾을 수 없습니다. 올바른 영웅 카드 HTML인지 확인해주세요."
    );
  }

  const jsonStart = dataKeyMatch.index + dataKeyMatch[0].length;
  const jsonStr = extractJsonBlock(htmlContent, "{", "}", jsonStart);
  if (!jsonStr) {
    throw new Error("CHARACTER_DATA의 JSON 블록을 추출하지 못했습니다.");
  }

  let characterData: CharacterData;
  try {
    characterData = JSON.parse(jsonStr);
  } catch {
    throw new Error("CHARACTER_DATA JSON 파싱에 실패했습니다.");
  }

  // Find `const CHARACTER_IMAGES = [` (optional)
  let portraitDataUrl: string | null = null;
  const imagesKeyMatch = htmlContent.match(/const\s+CHARACTER_IMAGES\s*=\s*(?=\[)/);
  if (imagesKeyMatch && imagesKeyMatch.index !== undefined) {
    const arrStart = imagesKeyMatch.index + imagesKeyMatch[0].length;
    const arrStr = extractJsonBlock(htmlContent, "[", "]", arrStart);
    if (arrStr) {
      try {
        const images: string[] = JSON.parse(arrStr);
        portraitDataUrl = images.find((s) => s.startsWith("data:image/")) ?? null;
      } catch {
        portraitDataUrl = null;
      }
    }
  }

  return { characterData, portraitDataUrl };
}
