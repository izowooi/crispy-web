/**
 * docs/NovelAI_Characters.csv → public/characters.json 변환.
 * 빌드 시 1회 실행 (`npm run prebuild`).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";

const ROOT = resolve(__dirname, "..");
const CSV = resolve(ROOT, "../docs/NovelAI_Characters.csv");
const OUT = resolve(ROOT, "public/characters.json");

type Row = { work: string; kor: string; eng: string };

function parseCsv(content: string): Row[] {
  // BOM 제거
  const text = content.replace(/^﻿/, "");
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  const [, ...data] = lines; // 헤더 제외
  const rows: Row[] = [];
  for (const line of data) {
    // 단순 CSV 가정: 컬럼에 쉼표·따옴표 없음 (현재 데이터셋 확인됨)
    const parts = line.split(",");
    if (parts.length < 3) continue;
    const [work, kor, ...rest] = parts;
    const eng = rest.join(","); // 영문에 쉼표가 들어간 경우 보호
    if (!work || !kor || !eng) continue;
    rows.push({ work: work.trim(), kor: kor.trim(), eng: eng.trim() });
  }
  return rows;
}

const content = readFileSync(CSV, "utf-8");
const rows = parseCsv(content);

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(rows), "utf-8");

console.log(`built ${rows.length} characters → ${OUT}`);
