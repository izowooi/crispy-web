#!/usr/bin/env node
// 어린이집 관리 비밀번호(PIN)를 바꾸는 SQL 파일을 만든다. 이 스크립트는 DB 에 접속하지 않는다.
//
//   DAYCARE_ID=<DAYCARE_ID> NEW_PIN='새 비밀번호' node set-pin.mjs ./set-pin.sql
//
// 앱의 hashPin()/derive() 와 같은 방식이다: PBKDF2 · SHA-256 · 100,000 회 · 16바이트 salt · 256비트 · 16진수 문자열.
// PIN 은 명령줄 인자가 아니라 환경 변수로만 받는다(셸 히스토리·프로세스 목록에 남지 않게).
import { writeFileSync } from "node:fs";

const ITERATIONS = 100_000;
const toHex = (buffer) => [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");

const outPath = process.argv[2];
const id = process.env.DAYCARE_ID ?? "";
const pin = (process.env.NEW_PIN ?? "").trim();

if (!outPath) fail("사용법: DAYCARE_ID=... NEW_PIN=... node set-pin.mjs <출력.sql>");
if (!/^[a-z0-9]{4,16}$/.test(id)) fail("DAYCARE_ID 가 올바르지 않습니다(소문자·숫자 4~16자).");
if (pin.length < 4 || pin.length > 64) fail("NEW_PIN 은 4~64자여야 합니다(앱의 createDaycare 와 같은 규칙).");

const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS }, key, 256);

const sql = `UPDATE daycares SET pin_salt = '${toHex(salt)}', pin_hash = '${toHex(bits)}' WHERE id = '${id}';\n`;
// salt/hash 도 오프라인 대입 공격의 재료라서 본인만 읽을 수 있게(0600) 만든다. 적용한 뒤 바로 지운다.
writeFileSync(outPath, sql, { mode: 0o600 });
console.log(`SQL 을 ${outPath} 에 썼습니다(PIN 자체는 출력하지 않습니다). 적용 후 파일을 삭제하세요.`);

function fail(message) {
  console.error(message);
  process.exit(1);
}
