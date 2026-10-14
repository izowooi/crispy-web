#!/usr/bin/env node
/**
 * Validate pre-generated recipes (JSON Lines) and turn them into one SQL file for D1.
 *
 *   node scripts/seed-recipes.mjs [--remote] --out .wrangler/seed.sql <file.jsonl>...
 *   npx wrangler d1 execute infinite-merge --remote --file .wrangler/seed.sql
 *
 * Each line: {"a":"불","b":"물","name":"증기","emoji":"♨️","desc":"…"}
 * - a and b must already exist (in the DB, or as an accepted name earlier in the input). Lines whose
 *   ingredients appear only later are retried until nothing more can be placed, so files can reference
 *   each other in any order.
 * - New elements are written with first_by_sub = 'seed': unclaimed until a player makes them
 *   (migrations/0002_seed_claim.sql). Existing elements and recipes are never overwritten.
 * - Same checks as the live engine: 1–12 characters, no stray emoji in names, one real (RGI) emoji
 *   or ✨, desc trimmed without a trailing period.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const args = process.argv.slice(2);
const remote = args.includes("--remote");
const outIndex = args.indexOf("--out");
const out = outIndex === -1 ? ".wrangler/seed.sql" : args[outIndex + 1];
const files = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--out");
if (files.length === 0) {
  console.error("usage: node scripts/seed-recipes.mjs [--remote] [--out seed.sql] <file.jsonl>...");
  process.exit(1);
}

const normalize = (s) => String(s ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
const pairKey = (a, b) => [normalize(a), normalize(b)].sort().join("+");
const graphemes = (s) => [...new Intl.Segmenter("ko", { granularity: "grapheme" }).segment(s)].map((g) => g.segment);
const RGI = /^\p{RGI_Emoji}$/v;
const PICTO = /\p{Extended_Pictographic}/u;

function query(sql) {
  const raw = execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "infinite-merge", remote ? "--remote" : "--local", "--json", "--command", sql],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 256 * 1024 * 1024 },
  );
  return JSON.parse(raw)[0].results;
}

console.log(`Reading existing world from ${remote ? "remote" : "local"} D1…`);
const known = new Set(query("SELECT name FROM im_elements").map((r) => r.name));
const pairs = new Set(query("SELECT pair_key FROM im_recipes").map((r) => r.pair_key));
const existingCount = known.size;

const stats = { lines: 0, badJson: 0, badName: 0, mechanical: 0, dupPair: 0, unplaced: 0, emojiFixed: 0 };
let pending = [];
for (const file of files) {
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    stats.lines += 1;
    try {
      pending.push(JSON.parse(line));
    } catch {
      stats.badJson += 1;
    }
  }
}

const newElements = new Map();
const recipes = [];
let progressed = true;
while (progressed && pending.length > 0) {
  progressed = false;
  const later = [];
  for (const r of pending) {
    const a = normalize(r.a);
    const b = normalize(r.b);
    const name = normalize(r.name).replace(/^["'「『]+|["'」』.!?]+$/g, "");
    if (!known.has(a) || !known.has(b)) {
      later.push(r);
      continue;
    }
    const len = graphemes(name).length;
    if (len < 1 || len > 12 || PICTO.test(name)) {
      stats.badName += 1;
      continue;
    }
    if (name === a + b || name === b + a || /의 /.test(name)) {
      stats.mechanical += 1;
      continue;
    }
    const key = pairKey(a, b);
    if (pairs.has(key)) {
      stats.dupPair += 1;
      continue;
    }
    let emoji = normalize(r.emoji);
    if (!RGI.test(emoji)) {
      emoji = "✨";
      stats.emojiFixed += 1;
    }
    let desc = normalize(r.desc).replace(/[.。]+$/, "");
    if (graphemes(desc).length > 40) desc = graphemes(desc).slice(0, 40).join("");
    if (!known.has(name)) {
      known.add(name);
      newElements.set(name, { name, emoji, desc });
    }
    const [x, y] = [a, b].sort();
    pairs.add(key);
    recipes.push({ key, a: x, b: y, result: name });
    progressed = true;
  }
  pending = later;
}
stats.unplaced = pending.length;

const q = (v) => (v === null || v === undefined || v === "" ? "NULL" : `'${String(v).replaceAll("'", "''")}'`);
const base = Date.now();
const chunks = (list, n) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n));
const sql = [];
let t = 0;
for (const group of chunks([...newElements.values()], 200)) {
  sql.push(
    "INSERT OR IGNORE INTO im_elements (name, emoji, desc, created_at, first_by_sub) VALUES\n" +
      group.map((e) => `(${q(e.name)}, ${q(e.emoji)}, ${q(e.desc)}, ${base + t++}, 'seed')`).join(",\n") +
      ";",
  );
}
for (const group of chunks(recipes, 200)) {
  sql.push(
    "INSERT OR IGNORE INTO im_recipes (pair_key, a, b, result_name, model, created_at, created_by_sub) VALUES\n" +
      group.map((r) => `(${q(r.key)}, ${q(r.a)}, ${q(r.b)}, ${q(r.result)}, 'seed', ${base + t++}, 'seed')`).join(",\n") +
      ";",
  );
}
fs.writeFileSync(out, sql.join("\n") + "\n");

console.log(JSON.stringify({ ...stats, existingElements: existingCount, newElements: newElements.size, newRecipes: recipes.length }, null, 2));
console.log(`SQL → ${out} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
