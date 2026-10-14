// 실습: "오늘 날짜"를 UTC로 계산하면 왜 한국에서 하루 틀어지는가.
// 실행: node learn/labs/dates/kst-lab.mjs
// 비교 실험: TZ=America/New_York node learn/labs/dates/kst-lab.mjs   (내 컴퓨터 시간대를 바꿔도 KST 결과는 그대로)
//
// 아래 todayKST / addDays / weekdayKo 는 src/lib/dates.ts 와 같은 구현입니다.

function todayKST(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
const toUtc = (date) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
function addDays(date, days) {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
const weekdayKo = (date) => "일월화수목금토"[toUtc(date).getUTCDay()];

console.log(`이 컴퓨터의 시간대(TZ): ${Intl.DateTimeFormat().resolvedOptions().timeZone}\n`);

console.log("── 1) 순간(UTC)별 '오늘' : 순진한 방법 vs todayKST ──");
console.log("   순진한 방법 = new Date().toISOString().slice(0, 10)  (UTC 기준 날짜)\n");
const instants = [
  ["2026-10-12T14:59:59Z", "한국 10/12 23:59:59"],
  ["2026-10-12T15:00:00Z", "한국 10/13 00:00:00 (자정 직후)"],
  ["2026-10-12T20:00:00Z", "한국 10/13 05:00 (출근 전)"],
  ["2026-10-13T00:30:00Z", "한국 10/13 09:30 (아침 확인)"],
];
console.log("   UTC 순간               한국 시각                        순진한 방법   todayKST   일치?");
for (const [iso, label] of instants) {
  const now = new Date(iso);
  const naive = now.toISOString().slice(0, 10);
  const kst = todayKST(now);
  console.log(`   ${iso}  ${label.padEnd(30)}  ${naive}    ${kst}   ${naive === kst ? "O" : "X  ← 하루 어긋남"}`);
}
console.log("\n   → 한국 아침 0~9시에는 UTC 날짜가 '어제'입니다. 서버(UTC)에서 순진하게 계산하면 새벽에 어제 식단이 뜹니다.\n");

console.log("── 2) 'YYYY-MM-DD'를 Date로 바꿀 때의 함정 ──");
const localMidnight = new Date(2026, 9, 13); // 이 컴퓨터 시간대의 10/13 00:00
console.log(`   new Date(2026, 9, 13).toISOString() = ${localMidnight.toISOString()}`);
console.log("   → 한국(UTC+9) 컴퓨터에서 실행하면 '2026-10-12T15:00:00.000Z' 로 날짜가 하루 전으로 보입니다.");
console.log("   그래서 dates.ts 는 날짜 계산을 전부 Date.UTC(...) / getUTC*() 로만 합니다.\n");

console.log("── 3) addDays: 월·연 경계 ──");
for (const [from, n] of [["2026-10-31", 1], ["2026-01-01", -1], ["2026-02-28", 1], ["2028-02-28", 1]]) {
  console.log(`   addDays("${from}", ${String(n).padStart(2)}) = ${addDays(from, n)}`);
}
console.log();

console.log("── 4) 요일 계산 (AI가 읽은 요일 검증에 사용) ──");
for (const d of ["2026-10-01", "2026-10-09", "2026-10-13"]) console.log(`   ${d} → ${weekdayKo(d)}요일`);
console.log("\n   2026-10-01 이 '목'이 아니라고 적힌 식단표라면 normalizeSheet 가 경고를 냅니다.");

console.log("\n── 5) 지금 이 순간 ──");
const now = new Date();
console.log(`   UTC 날짜 ${now.toISOString().slice(0, 10)} / KST 날짜(todayKST) ${todayKST(now)}`);
