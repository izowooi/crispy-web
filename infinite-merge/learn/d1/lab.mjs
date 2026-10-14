#!/usr/bin/env node
// D1 실습 도구: SQL을 D1 binding(env.DB)으로 직접 실행하고, 결과와 함께 D1이 돌려주는 meta
// (rows_read, rows_written, size_after, 처리 리전…)를 보여 준다. 앱 코드가 쓰는 것과 같은 binding API다.
//
//   npm run lab:d1 -- "SELECT * FROM im_elements LIMIT 5"           # 로컬 D1 (.wrangler/state)
//   npm run lab:d1 -- --file learn/d1/queries/01-overview.sql        # 파일의 여러 문장
//   npm run lab:d1 -- --remote "SELECT COUNT(*) FROM im_recipes"     # 원격(운영) D1, 읽기 전용
//   npm run lab:d1 -- --remote --write "UPDATE …"                    # 원격 쓰기: 명시적으로만
//
// 로컬과 호스팅이 같은 원격 DB를 쓰므로, 원격에서 쓰는 문장은 --write 없이 거부한다.
import fs from "node:fs";
import { getPlatformProxy, unstable_splitSqlQuery as splitSql } from "wrangler";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  if (i === -1) return false;
  args.splice(i, 1);
  return true;
};
const option = (name) => {
  const i = args.indexOf(name);
  if (i === -1) return null;
  const [, value] = args.splice(i, 2);
  return value;
};

const remote = flag("--remote");
const allowWrite = flag("--write");
const file = option("--file");
const sql = file ? fs.readFileSync(file, "utf8") : args.join(" ");
if (!sql.trim()) {
  console.error('사용법: npm run lab:d1 -- [--remote [--write]] "SQL" | --file path.sql');
  process.exit(1);
}

const READ_ONLY = /^\s*(--[^\n]*\n\s*)*(select|with|explain|pragma)\b/i;
const statements = splitSql(sql).filter((s) => s.replace(/--[^\n]*/g, "").trim());
const writes = statements.filter((s) => !READ_ONLY.test(s));
if (remote && writes.length > 0 && !allowWrite) {
  console.error("원격 DB는 호스팅 사이트와 공유됩니다. 쓰기 문장이 있어 중단합니다:");
  for (const s of writes) console.error("  · " + s.trim().split("\n").at(-1).slice(0, 100));
  console.error("정말 원격에 쓰려면 --write 를 붙이세요. 먼저 로컬(--remote 없이)에서 연습하는 것을 권장합니다.");
  process.exit(2);
}

// envFiles: [] → .env.local의 비밀값을 이 도구에 불러오지 않는다. remoteBindings가 원격/로컬을 가른다.
const { env, dispose } = await getPlatformProxy({ remoteBindings: remote, envFiles: [] });
console.log(`\n▶ ${remote ? "원격(운영) D1" : "로컬 D1 (.wrangler/state)"} · 문장 ${statements.length}개\n`);

let totals = { rows_read: 0, rows_written: 0 };
let failures = 0;
try {
  for (const statement of statements) {
    const text = statement.trim();
    console.log("─".repeat(72));
    console.log(text.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n"));
    let result;
    try {
      result = await env.DB.prepare(text).all();
    } catch (err) {
      failures += 1;
      console.log(`✗ ${err.cause?.message ?? err.message}`);
      continue;
    }
    if (result.results.length > 0) console.table(result.results.slice(0, 50));
    if (result.results.length > 50) console.log(`… ${result.results.length - 50}행 더 있음`);
    const m = result.meta ?? {};
    totals = { rows_read: totals.rows_read + (m.rows_read ?? 0), rows_written: totals.rows_written + (m.rows_written ?? 0) };
    console.log(
      `meta: rows_read=${m.rows_read} rows_written=${m.rows_written} changes=${m.changes} ` +
        `duration=${m.duration}ms size_after=${m.size_after}B` +
        (m.served_by_region ? ` region=${m.served_by_region}` : ""),
    );
  }
  console.log("─".repeat(72));
  console.log(`합계: rows_read=${totals.rows_read} rows_written=${totals.rows_written}  (Free: 하루 읽기 500만·쓰기 10만 행)`);
  if (failures > 0) console.log(`실패한 문장 ${failures}개`);
  console.log("");
} finally {
  await dispose();
}
process.exitCode = failures > 0 ? 1 : 0;
