/**
 * NovelAI 이미지 생성 API 호출 클라이언트.
 * 페이로드 빌드 → POST → ZIP 응답 → PNG 바이트 배열.
 * 스킬: .claude/skills/nai-api-client/SKILL.md
 */
import { unzipSync } from "fflate";
import type { GenerateInput } from "./types";
import { buildNaiV45Payload } from "./nai-payload";

const NAI_URL = "https://image.novelai.net/ai/generate-image";

export async function callNai(input: GenerateInput, token: string): Promise<Uint8Array[]> {
  const payload = buildNaiV45Payload(input);
  const r = await fetch(NAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!r.ok) {
    const body = await r.text().catch(() => "");
    // 응답 본문에 토큰이 우연히 포함될 가능성은 낮지만 안전을 위해 절단
    const safe = body.slice(0, 300);
    throw new Error(`NAI HTTP ${r.status}: ${safe}`);
  }

  const buf = new Uint8Array(await r.arrayBuffer());
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(buf);
  } catch (e) {
    throw new Error(`NAI 응답 ZIP 파싱 실패: ${(e as Error).message}`);
  }

  const images: Uint8Array[] = [];
  for (const [name, bytes] of Object.entries(entries)) {
    if (name.toLowerCase().endsWith(".png")) images.push(bytes);
  }
  if (images.length === 0) {
    throw new Error("NAI 응답에 PNG가 없습니다 (no png)");
  }
  return images;
}
