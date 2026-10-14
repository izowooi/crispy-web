#!/usr/bin/env node
// 원격(운영) D1을 통째로 내보내(export) 로컬 D1(.wrangler/state)에 그대로 들여온다.
// 운영 데이터를 가지고 쓰기·삭제 실습을 하되, 운영 DB는 건드리지 않기 위한 도구다.
//
//   npm run lab:clone-remote
//
// 1) wrangler d1 export infinite-merge --remote --output .wrangler/remote-dump.sql
// 2) 로컬 D1 상태 폴더(.wrangler/state/v3/d1)를 지운다  ← 로컬 사본만 지운다
// 3) wrangler d1 execute infinite-merge --local --file .wrangler/remote-dump.sql
// 덤프에는 플레이어 ID 같은 운영 데이터가 들어 있으므로 gitignore된 .wrangler/ 아래에만 둔다.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const dump = path.join(root, ".wrangler", "remote-dump.sql");
const localD1 = path.join(root, ".wrangler", "state", "v3", "d1");
const wrangler = (...args) => execFileSync("npx", ["wrangler", ...args], { cwd: root, stdio: "inherit" });

fs.mkdirSync(path.dirname(dump), { recursive: true });
console.log("① 원격 D1 내보내기 (읽기만 함)");
wrangler("d1", "export", "infinite-merge", "--remote", "--output", dump);
console.log(`   → ${path.relative(root, dump)} (${(fs.statSync(dump).size / 1024).toFixed(1)} KB)`);

console.log("② 로컬 D1 사본 초기화");
fs.rmSync(localD1, { recursive: true, force: true });

console.log("③ 로컬 D1에 들여오기");
wrangler("d1", "execute", "infinite-merge", "--local", "--file", dump, "--yes");
console.log("\n완료. 이제 로컬에서 자유롭게 실습하세요:  npm run lab:d1 -- --file learn/d1/queries/01-overview.sql");
