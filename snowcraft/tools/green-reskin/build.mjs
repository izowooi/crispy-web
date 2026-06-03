#!/usr/bin/env node
// green-reskin/build.mjs — 고유 이미지 19개를 98프레임으로 팬아웃하고 index.json을 갱신한다.
//
// 사용법:
//   node tools/green-reskin/build.mjs            # sources/ -> 98 프레임 복사 + index.json 갱신
//   node tools/green-reskin/build.mjs --dry      # 실제 쓰기 없이 무엇을 할지만 출력
//
// 동작:
//   1. tools/green-reskin/groups.json 의 그룹 정의를 읽는다.
//   2. 각 그룹의 sources/<rep>.png 를 그룹의 모든 member 프레임으로 복사한다.
//      (sources/<rep>.png 가 없으면 그 그룹은 건너뛰고 경고 — 기존 프레임 유지)
//   3. public/assets/sprites/green/index.json 의 각 프레임 w/h 를 실제 PNG 크기로 갱신한다.
//      footX/footY/labels 는 건드리지 않는다.
//   4. 렌더러는 footY > 이미지 height 일 때만 bottom-center 로 그린다. height 가 footY 이상이면
//      앵커가 어긋날 수 있으므로 경고한다. (원본 footY 는 180~189)
//
// 의존성 없음 — Node 표준 모듈만 사용한다.
import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const SPRITES = join(HERE, "..", "..", "public", "assets", "sprites", "green");
const SOURCES = join(HERE, "sources");
const groups = JSON.parse(readFileSync(join(HERE, "groups.json"), "utf8")).groups;
const dry = process.argv.includes("--dry");

// PNG 헤더(IHDR)에서 width/height 를 읽는다. PNG signature(8) + chunk len(4) + "IHDR"(4)
// 다음에 width(4, BE), height(4, BE) 가 온다.
function pngSize(path) {
  const b = readFileSync(path);
  if (b.length < 24 || b.toString("ascii", 12, 16) !== "IHDR") {
    throw new Error(`${path}: PNG 헤더를 읽을 수 없음`);
  }
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

const index = JSON.parse(readFileSync(join(SPRITES, "index.json"), "utf8"));
const byFrame = new Map(index.frames.map((f) => [f.frame, f]));

let copied = 0, missing = [], warnings = [];

for (const g of groups) {
  const srcPath = join(SOURCES, `${g.rep}.png`);
  if (!existsSync(srcPath)) {
    missing.push(g.rep);
    continue;
  }
  const { w, h } = pngSize(srcPath);
  for (const m of g.members) {
    const dst = join(SPRITES, `${m}.png`);
    if (!dry) copyFileSync(srcPath, dst);
    copied++;
    const entry = byFrame.get(m);
    if (entry) {
      entry.w = w;
      entry.h = h;
      if (h >= entry.footY) {
        warnings.push(`frame ${m}: height ${h} >= footY ${entry.footY} → bottom-center 앵커가 깨질 수 있음 (이미지를 더 작게)`);
      }
    }
  }
  console.log(`group rep ${g.rep} (${g.labels.join(",")}) ${w}x${h} -> ${g.members.length} frames ${dry ? "(dry)" : ""}`);
}

if (!dry) {
  writeFileSync(join(SPRITES, "index.json"), JSON.stringify(index, null, 2) + "\n");
}

console.log("");
console.log(`복사한 프레임: ${copied}/98 ${dry ? "(dry-run, 실제 변경 없음)" : ""}`);
if (!dry) console.log("index.json w/h 갱신 완료 (footX/footY/labels 유지).");
if (missing.length) console.log(`⚠ sources/ 에 없는 그룹(건너뜀): ${missing.map((r) => `${r}.png`).join(", ")}`);
if (warnings.length) {
  console.log("⚠ 앵커 경고:");
  for (const w of warnings) console.log("  - " + w);
}
