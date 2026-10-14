#!/usr/bin/env node
// 방어 실습용 부하 도구: 같은 IP에서 요청을 몰아 보내고 응답 코드를 집계한다.
//
//   npm run lab:hammer                                         # 로컬 preview(127.0.0.1:8787)의 /api/combine에 100번
//   npm run lab:hammer -- --url https://merge.zowoo.uk -n 300 -c 12
//   npm run lab:hammer -- --path /auth/guest -n 60
//
// 쿠키 없이 보내므로 /api/combine은 로그인 확인(401)까지만 간다. rate limit 검사가 그보다 앞에 있어서
// AI 호출·D1 쓰기·크레딧 소모 없이 Rate Limiting binding만 시험할 수 있다. 남의 사이트에는 쓰지 마세요.
const args = process.argv.slice(2);
const opt = (names, fallback) => {
  const i = args.findIndex((a) => names.includes(a));
  return i === -1 ? fallback : args[i + 1];
};
const base = opt(["--url"], "http://127.0.0.1:8787").replace(/\/$/, "");
const route = opt(["--path"], "/api/combine");
const total = Number(opt(["-n", "--count"], 100));
const concurrency = Number(opt(["-c", "--concurrency"], 1));

const timeline = [];
const tally = new Map();
let next = 0;
const started = Date.now();

async function worker() {
  while (next < total) {
    const i = next++;
    let label;
    try {
      const res = await fetch(base + route, {
        method: "POST",
        headers: { Origin: base, "Content-Type": "application/json" },
        body: JSON.stringify({ a: "불", b: "물" }),
      });
      const body = await res.json().catch(() => null);
      label = `${res.status}${body?.error?.code ? ` ${body.error.code}` : ""}`;
    } catch (err) {
      label = `network ${err.cause?.code ?? err.message}`;
    }
    timeline[i] = label.slice(0, 3);
    tally.set(label, (tally.get(label) ?? 0) + 1);
  }
}

console.log(`${base}${route} 에 ${total}번 (동시 ${concurrency})…`);
await Promise.all(Array.from({ length: concurrency }, worker));
const seconds = (Date.now() - started) / 1000;
console.log(`\n${seconds.toFixed(1)}초 · 초당 ${(total / seconds).toFixed(1)}회`);
for (const [label, n] of [...tally].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${label}`);
const first = timeline.indexOf("429");
console.log(first === -1 ? "\n429 없음: 한도 안이거나, binding이 아직 동기화 전이에요." : `\n첫 429: ${first + 1}번째 요청`);
console.log("순서:", timeline.map((c) => (c === "429" ? "■" : "·")).join(""));
