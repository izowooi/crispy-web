// 실습: Zod 스키마 하나가 (1) AI에게 보내는 JSON Schema와 (2) 받은 결과의 검사기를 동시에 만든다.
// 실행: node learn/labs/claude/schema-lab.mjs   (menu/ 폴더에서. API 호출·비용 없음)
//
// src/lib/schema.ts 를 줄여 만든 연습용 스키마입니다. 실제 앱도 같은 원리로 동작합니다.
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

const MenuItem = z.object({
  name: z.string(),
  allergens: z.array(z.number().int()),
});

const Day = z.object({
  date: z.string().describe("YYYY-MM-DD"),
  weekday: z.string().describe("사진에 적힌 요일 한 글자"),
  closed: z.boolean(),
  lunch: z.array(MenuItem),
  kcal: z.number().nullable(),
});

const Sheet = z.object({ year: z.number().int(), month: z.number().int(), days: z.array(Day) });

console.log("── 1) AI에게 실제로 전달되는 JSON Schema (betaZodOutputFormat) ──");
const format = betaZodOutputFormat(Sheet);
console.log(JSON.stringify(format.schema, null, 2).split("\n").slice(0, 38).join("\n"));
console.log("   … (이하 생략)\n");
console.log("   → 이 스키마 덕분에 Claude는 '이 모양의 JSON'만 출력하도록 제한됩니다.");
console.log("   → .describe(...) 문구는 필드 설명으로 함께 전달돼 모델의 힌트가 됩니다.\n");

console.log("── 2) 받은 결과를 같은 스키마로 검사 ──");
const good = { year: 2026, month: 10, days: [{ date: "2026-10-13", weekday: "화", closed: false, lunch: [{ name: "모듬버섯국", allergens: [5, 6] }], kcal: 445 }] };
console.log("정상 데이터   :", Sheet.safeParse(good).success);

const bad = { year: "2026", month: 10, days: [{ date: "2026-10-13", closed: "no", lunch: [{ name: "국", allergens: [1.5] }], kcal: undefined }] };
const result = Sheet.safeParse(bad);
console.log("잘못된 데이터 :", result.success);
for (const issue of result.error.issues) console.log(`   - ${issue.path.join(".")}: ${issue.message}`);

console.log("\n── 3) 스키마를 통과해도 '내용'이 맞다는 보장은 없습니다 ──");
const plausible = { year: 2026, month: 10, days: [{ date: "2026-10-07", weekday: "목", closed: false, lunch: [{ name: "기장밥", allergens: [] }], kcal: 445 }] };
console.log("형식 검사 통과?", Sheet.safeParse(plausible).success);

// src/lib/sheet.ts 의 요일 검사를 줄여 옮긴 것
const actual = (date) => "일월화수목금토"[new Date(`${date}T00:00:00Z`).getUTCDay()];
for (const d of plausible.days) {
  if (d.weekday !== actual(d.date)) console.log(`   ⚠ ${d.date}: 사진에는 '${d.weekday}'요일, 달력상 ${actual(d.date)}요일 → 사용자에게 경고`);
}
console.log("\n💡 그래서 앱은 '스키마(모양) → normalizeSheet(내용 점검) → 사람이 검토' 3단계를 거칩니다.");
