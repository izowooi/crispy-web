import { gunzipSync, unzlibSync, strFromU8 } from "fflate";
import type { NaiPromptMetadata } from "./types";

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const STEALTH_MAGIC = new TextEncoder().encode("stealth_pngcomp");

function readU32(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset);
}

function latin1(bytes: Uint8Array): string {
  return new TextDecoder("latin1").decode(bytes);
}

export function parsePngTextChunks(bytes: Uint8Array): Record<string, string> {
  if (!PNG_SIGNATURE.every((value, i) => bytes[i] === value)) return {};
  const result: Record<string, string> = {};
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = readU32(bytes, offset);
    const type = latin1(bytes.subarray(offset + 4, offset + 8));
    const start = offset + 8;
    const end = start + length;
    if (end + 4 > bytes.length) break;
    const data = bytes.subarray(start, end);
    try {
      const zero = data.indexOf(0);
      if (type === "tEXt" && zero >= 0) {
        result[latin1(data.subarray(0, zero))] = latin1(data.subarray(zero + 1));
      } else if (type === "zTXt" && zero >= 0) {
        result[latin1(data.subarray(0, zero))] = latin1(unzlibSync(data.subarray(zero + 2)));
      } else if (type === "iTXt" && zero >= 0) {
        const key = latin1(data.subarray(0, zero));
        const compressed = data[zero + 1] === 1;
        let cursor = zero + 3;
        cursor = data.indexOf(0, cursor) + 1;
        cursor = data.indexOf(0, cursor) + 1;
        const text = data.subarray(cursor);
        result[key] = strFromU8(compressed ? unzlibSync(text) : text);
      }
    } catch {
      // A malformed optional chunk must not prevent other metadata from being inspected.
    }
    if (type === "IEND") break;
    offset = end + 4;
  }
  return result;
}

function normalizeMetadata(text: Record<string, string>, stealth?: Record<string, unknown>): NaiPromptMetadata | null {
  let comment: Record<string, unknown> | null = null;
  const raw = text.Comment;
  if (raw) {
    try { comment = JSON.parse(raw) as Record<string, unknown>; } catch { /* ignored */ }
  }
  if (!comment && stealth) {
    const nested = stealth.Comment;
    if (typeof nested === "string") {
      try { comment = JSON.parse(nested) as Record<string, unknown>; } catch { /* ignored */ }
    } else if (nested && typeof nested === "object") {
      comment = nested as Record<string, unknown>;
    } else {
      comment = stealth;
    }
  }
  const prompt = typeof comment?.prompt === "string" ? comment.prompt : text.Description ?? "";
  const negativePrompt = typeof comment?.uc === "string"
    ? comment.uc
    : typeof comment?.negative_prompt === "string" ? comment.negative_prompt : "";
  return prompt.trim() || negativePrompt.trim() ? { prompt, negativePrompt } : null;
}

async function extractStealth(file: File): Promise<Record<string, unknown> | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const total = canvas.width * canvas.height;
    const packed = new Uint8Array(Math.ceil(total / 8));
    let bit = 0;
    for (let x = 0; x < canvas.width; x++) {
      for (let y = 0; y < canvas.height; y++) {
        if ((pixels[(y * canvas.width + x) * 4 + 3] & 1) === 1) packed[bit >> 3] |= 1 << (7 - (bit & 7));
        bit++;
      }
    }
    if (!STEALTH_MAGIC.every((value, i) => packed[i] === value)) return null;
    let offset = STEALTH_MAGIC.length;
    const lengthBits = readU32(packed, offset);
    offset += 4;
    const json = strFromU8(gunzipSync(packed.subarray(offset, offset + Math.ceil(lengthBits / 8))));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function inspectNaiPng(file: File): Promise<NaiPromptMetadata> {
  if (file.type && file.type !== "image/png") throw new Error("PNG 파일만 Inspector로 읽을 수 있습니다.");
  if (file.size > 25 * 1024 * 1024) throw new Error("25MB 이하 PNG를 사용해주세요.");
  const text = parsePngTextChunks(new Uint8Array(await file.arrayBuffer()));
  let metadata = normalizeMetadata(text);
  if (!metadata) metadata = normalizeMetadata(text, (await extractStealth(file)) ?? undefined);
  if (!metadata) throw new Error("NovelAI 프롬프트 메타데이터를 찾지 못했습니다. Vision AI 분석은 수행하지 않습니다.");
  return metadata;
}
