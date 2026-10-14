#!/usr/bin/env node
// 원소가 N개로 늘면 DB가 얼마나 커질까? migrations/를 적용한 임시 SQLite 파일에 가짜 데이터를 넣고
// 실제 파일 크기(page_count × page_size)를 잰다. D1도 SQLite라 크기 감각이 그대로 통한다.
//
//   npm run lab:size                                  # 100 / 1,000 / 10,000 / 100,000개
//   npm run lab:size -- 500 5000 --recipes 3 --discoveries 10
//
// 가정(바꿀 수 있음): 원소 1개당 레시피 --recipes개(기본 2), 발견 기록 --discoveries개(기본 5),
// 게스트 계정·세션 --guests개(기본 0.2: 원소 5개당 게스트 1명). 행 내용은 운영 DB 실측 평균(약 85바이트)에 맞췄다.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  if (i === -1) return fallback;
  const [, value] = args.splice(i, 2);
  return Number(value);
};
const recipesPer = opt("--recipes", 2);
const discoveriesPer = opt("--discoveries", 5);
const guestsPer = opt("--guests", 0.2);
const counts = args.length ? args.map(Number) : [100, 1_000, 10_000, 100_000];

const migrationsDir = path.resolve(import.meta.dirname, "../../migrations");
const schema = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => fs.readFileSync(path.join(migrationsDir, f), "utf8"))
  .join("\n");

const SAMPLE = [
  ["증기기관", "🚂", "산업혁명의 심장 박동"],
  ["도자기", "🏺", "흙이 불 속에서 견딘 끝에 얻은 단단함"],
  ["비구름", "🌧️", "바다가 하늘에 올려 보낸 편지"],
  ["대장장이", "⚒️", "불과 쇠를 다루는 손"],
];
const guestSub = () => "guest:" + Math.random().toString(36).slice(2).padEnd(22, "x");

function measure(n) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "im-size-")), "sim.db");
  const db = new DatabaseSync(file);
  db.exec(schema);
  const now = Date.now();
  db.exec("BEGIN");
  const el = db.prepare("INSERT INTO im_elements (name, emoji, desc, created_at, first_by_sub) VALUES (?, ?, ?, ?, ?)");
  const names = [];
  for (let i = 0; i < n; i++) {
    const [name, emoji, desc] = SAMPLE[i % SAMPLE.length];
    names.push(`${name}${i}`);
    el.run(`${name}${i}`, emoji, desc, now + i, guestSub());
  }
  const pick = () => names[Math.floor(Math.random() * names.length)];
  const rc = db.prepare(
    "INSERT OR IGNORE INTO im_recipes (pair_key, a, b, result_name, model, created_at, created_by_sub) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  for (let i = 0; i < n * recipesPer; i++) {
    const [a, b] = [pick(), pick()].sort();
    rc.run(`${a}+${b}`, a, b, pick(), "claude-haiku-5-5", now, guestSub());
  }
  const guests = Array.from({ length: Math.max(1, Math.round(n * guestsPer)) }, guestSub);
  const ac = db.prepare("INSERT INTO im_accounts (sub, name, created_at, last_login_at) VALUES (?, '익명 연금술사', ?, ?)");
  const ss = db.prepare("INSERT INTO im_sessions (id, sub, created_at, expires_at) VALUES (?, ?, ?, ?)");
  for (const g of guests) {
    ac.run(g, now, now);
    ss.run(Math.random().toString(36).repeat(4).slice(0, 43), g, now, now + 30 * 86_400_000);
  }
  const dc = db.prepare("INSERT OR IGNORE INTO im_discoveries (sub, element_name, discovered_at, first_discovery) VALUES (?, ?, ?, 0)");
  for (let i = 0; i < n * discoveriesPer; i++) dc.run(guests[i % guests.length], pick(), now);
  db.exec("COMMIT");
  db.exec("VACUUM");
  const bytes = db.prepare("PRAGMA page_count").get().page_count * db.prepare("PRAGMA page_size").get().page_size;
  db.close();
  fs.rmSync(path.dirname(file), { recursive: true, force: true });
  return { bytes, guests: guests.length };
}

const LIMIT = 500 * 1000 * 1000; // D1 Free: 데이터베이스 1개당 500 MB
const fmt = (b) => (b >= 1e6 ? `${(b / 1e6).toFixed(2)} MB` : `${(b / 1e3).toFixed(1)} KB`);
console.log(`가정: 원소 1개당 레시피 ${recipesPer}, 발견 기록 ${discoveriesPer}, 게스트 ${guestsPer}명\n`);
console.log("원소 수".padStart(10), "DB 크기".padStart(12), "원소당".padStart(10), "500MB 대비".padStart(12));
for (const n of counts) {
  const { bytes } = measure(n);
  console.log(
    n.toLocaleString().padStart(10),
    fmt(bytes).padStart(12),
    `${Math.round(bytes / n).toLocaleString()} B`.padStart(10),
    `${((bytes / LIMIT) * 100).toFixed(3)}%`.padStart(12),
  );
}
console.log("\n참고: 빈 스키마도 테이블·인덱스마다 최소 1페이지(4 KB)를 쓴다. 운영 DB의 현재 크기는:");
console.log("  npx wrangler d1 info infinite-merge   → database_size");
