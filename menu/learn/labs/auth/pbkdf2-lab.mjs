// 실습: 비밀번호를 DB에 그대로 두지 않고 "해시"로 두는 원리와, 편집 쿠키 값(edit token)이 만들어지는 과정.
// 실행: node learn/labs/auth/pbkdf2-lab.mjs   (menu/ 폴더에서, 네트워크·DB·비밀값을 쓰지 않습니다)
//
// src/lib/server/auth.ts 의 derive/hashPin/verifyPin/editToken 과 같은 알고리즘입니다.
import { webcrypto as crypto, timingSafeEqual } from "node:crypto";

const enc = new TextEncoder();
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

async function derive(pin, salt, iterations) {
  const key = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return toHex(bits);
}

const ITERATIONS = 100_000; // Cloudflare Workers가 허용하는 최대값 (auth.ts 와 동일)
const DEMO_PIN = "demo-1234"; // 연습용 가짜 비밀번호
const DEMO_DAYCARE_ID = "demo2345"; // 연습용 가짜 어린이집 id

console.log("── 1) 같은 비밀번호라도 salt가 다르면 해시가 완전히 달라집니다 ──");
const saltA = crypto.getRandomValues(new Uint8Array(16));
const saltB = crypto.getRandomValues(new Uint8Array(16));
const hashA = await derive(DEMO_PIN, saltA, ITERATIONS);
const hashB = await derive(DEMO_PIN, saltB, ITERATIONS);
console.log("salt A :", toHex(saltA));
console.log("hash A :", hashA);
console.log("salt B :", toHex(saltB));
console.log("hash B :", hashB);
console.log("→ 같은 PIN인데 해시가 같은가?", hashA === hashB, "(false여야 정상: 두 어린이집이 같은 PIN을 써도 DB에서 티가 나지 않아요)\n");

console.log("── 2) 반복 횟수(iterations)가 늘수록 한 번 계산하는 데 오래 걸립니다 ──");
console.log("   느릴수록 공격자가 PIN을 하나씩 대입해 보는 속도도 느려집니다.");
for (const iterations of [1_000, 10_000, 100_000, 600_000]) {
  const t0 = performance.now();
  await derive(DEMO_PIN, saltA, iterations);
  const ms = (performance.now() - t0).toFixed(1).padStart(7);
  const note = iterations === ITERATIONS ? "  ← 이 앱의 값 (Workers 상한)" : iterations > ITERATIONS ? "  ← Node에선 되지만 Workers 상한(100,000)을 넘음" : "";
  console.log(`   ${String(iterations).padStart(7)}회 : ${ms} ms${note}`);
}
console.log();

console.log("── 3) 검증: 맞는 PIN / 틀린 PIN ──");
// auth.ts 의 safeEqual 은 길이가 같을 때 모든 글자를 끝까지 비교합니다(첫 불일치에서 멈추지 않음).
// Node 에서는 같은 일을 timingSafeEqual 이 해 줍니다.
async function verify(pin, salt, expectedHash) {
  const got = Buffer.from(await derive(pin, salt, ITERATIONS));
  const want = Buffer.from(expectedHash);
  return got.length === want.length && timingSafeEqual(got, want);
}
console.log("demo-1234  →", await verify(DEMO_PIN, saltA, hashA));
console.log("demo-1235  →", await verify("demo-1235", saltA, hashA), "\n");

console.log("── 4) 편집 쿠키 값(edit token) 만들기 ──");
// auth.ts: editToken = sha256(`baby-menu:edit:${daycareId}:${pinHash}`)
async function editToken(daycareId, pinHash) {
  return toHex(await crypto.subtle.digest("SHA-256", enc.encode(`baby-menu:edit:${daycareId}:${pinHash}`)));
}
const tokenBefore = await editToken(DEMO_DAYCARE_ID, hashA);
console.log("쿠키 값 (PIN 변경 전):", tokenBefore);

console.log("\n── 5) PIN을 바꾸면 기존 쿠키가 저절로 무효가 됩니다 ──");
const newSalt = crypto.getRandomValues(new Uint8Array(16));
const newHash = await derive("demo-5678", newSalt, ITERATIONS);
const tokenAfter = await editToken(DEMO_DAYCARE_ID, newHash);
console.log("쿠키 값 (PIN 변경 후):", tokenAfter);
console.log("→ 기기에 남아 있던 옛 쿠키가 여전히 통과하는가?", tokenBefore === tokenAfter, "(false → 비밀번호를 다시 입력해야 함)");
console.log("\n💡 서버는 쿠키 값을 DB에 따로 저장하지 않습니다. 매번 'DB의 pinHash로 다시 계산해서 비교'할 뿐이에요.");
