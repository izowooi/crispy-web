// R2 객체 키 실습 (네트워크·Cloudflare 계정 필요 없음)
//
// 실행: node learn/labs/data/r2-key-lab.mjs      (menu/ 폴더에서)
//
// 보여 주는 것
//   1) 사진 키 daycares/<id>/<업로드일>-<uuid8>.<확장자> 를 만드는 방법과 분해하는 방법
//   2) photoStillStored(): 키에 적힌 날짜만으로 "R2가 아직 이 사진을 갖고 있을까?"를 판단하는 로직
//   3) /api/images/[...key] 라우트의 경로 검사(daycares/ 접두어, ".." 금지)
//   4) 이 연습 파일의 값이 실제 앱(src/lib/dates.ts)과 어긋나지 않았는지 검사
//
// 아래 함수들은 src/lib/dates.ts 의 것을 일부러 JS로 옮겨 적은 사본입니다.
// (TypeScript 파일을 Node에서 바로 import 할 수 없어서, 읽는 연습용으로 따로 둡니다.)

import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";

const PHOTO_RETENTION_DAYS = 180; // R2 lifecycle 규칙 expire-menu-photos-180d 와 같은 값

// --- src/lib/dates.ts 사본 -------------------------------------------------
function isIsoDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

function addDays(date, days) {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function todayKST(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function photoStillStored(imageKey, today) {
  if (!imageKey) return false;
  const uploaded = /\/(\d{4}-\d{2}-\d{2})-[^/]+$/.exec(imageKey)?.[1];
  if (!uploaded || !isIsoDate(uploaded)) return true; // 날짜를 못 읽으면 "있다"고 가정
  return addDays(uploaded, PHOTO_RETENTION_DAYS - 1) > today;
}

// --- analyze 라우트가 키를 만드는 방식 ------------------------------------
function makeImageKey(daycareId, ext, now = new Date()) {
  return `daycares/${daycareId}/${todayKST(now)}-${randomUUID().slice(0, 8)}.${ext}`;
}

// --- images 라우트의 경로 검사 ---------------------------------------------
function isServableKey(objectKey) {
  return objectKey.startsWith("daycares/") && !objectKey.includes("..");
}

// ===========================================================================
console.log("1) 키 만들기");
const key = makeImageKey("demo1234", "jpg", new Date("2026-10-13T03:00:00Z"));
console.log("   ", key);
assert.match(key, /^daycares\/demo1234\/2026-10-13-[0-9a-f]{8}\.jpg$/);
const parts = key.split("/");
console.log("    접두어(lifecycle 규칙 대상) :", parts[0] + "/");
console.log("    어린이집 id                  :", parts[1]);
console.log("    파일 이름                    :", parts[2]);

console.log("\n2) 만료 판단 (업로드일 2026-10-13 의 사진)");
const stored = "daycares/demo1234/2026-10-13-aaaa1111.jpg";
const scenarios = [
  ["업로드 당일", "2026-10-13", true],
  ["178일 뒤", addDays("2026-10-13", 178), true],
  ["179일 뒤 (R2는 180일에 삭제 → 하루 먼저 링크를 숨김)", addDays("2026-10-13", 179), false],
  ["180일 뒤", addDays("2026-10-13", 180), false],
];
for (const [label, today, expected] of scenarios) {
  const actual = photoStillStored(stored, today);
  assert.equal(actual, expected, label);
  console.log(`    ${today}  ${actual ? "보임  " : "숨김  "}  ${label}`);
}
assert.equal(photoStillStored(null, "2026-10-13"), false);
assert.equal(photoStillStored("daycares/demo1234/legacy.jpg", "2030-01-01"), true);
console.log("    키 없음 → 숨김 / 날짜 없는 옛 키 → 보임(안전한 쪽으로 가정)");

console.log("\n3) /api/images 경로 검사");
for (const [k, expected] of [
  ["daycares/demo1234/2026-10-13-aaaa1111.jpg", true],
  ["other/secret.txt", false],
  ["daycares/../secret.txt", false],
  ["/daycares/demo1234/a.jpg", false],
]) {
  assert.equal(isServableKey(k), expected, k);
  console.log(`    ${expected ? "허용" : "거부"}  ${k}`);
}

console.log("\n4) 실제 앱 코드와 값이 같은지 검사");
const src = readFileSync(new URL("../../../src/lib/dates.ts", import.meta.url), "utf8");
const appDays = Number(/PHOTO_RETENTION_DAYS\s*=\s*(\d+)/.exec(src)?.[1]);
assert.equal(appDays, PHOTO_RETENTION_DAYS, "src/lib/dates.ts 의 PHOTO_RETENTION_DAYS 와 다릅니다");
console.log(`    PHOTO_RETENTION_DAYS = ${appDays} (앱과 동일) ✅`);

console.log("\n모든 확인 통과 ✅");
console.log(`
도전 과제 (이 파일을 직접 고쳐 보세요)
  - PHOTO_RETENTION_DAYS 를 90 으로 바꾸고 실행해 보세요. 어느 단계에서 먼저 실패하나요? 4번(앱 코드와 비교)은 왜 필요할까요?
    (앱은 src/lib/dates.ts 와 R2 lifecycle 규칙 두 군데에서 같은 값을 써야 합니다)
  - 2)의 시나리오에 "윤년 2028-02-29 업로드" 를 추가해 보세요. 경계가 맞나요?
  - makeImageKey 에서 todayKST 대신 UTC 날짜를 쓰면, 한국 시간 오전 8시 이전 업로드가 어떻게 되나요?
`);
