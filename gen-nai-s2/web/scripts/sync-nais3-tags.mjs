import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const source = process.env.NAIS3_TAGS_PATH || path.resolve(process.cwd(), "../../../NAIS3/resources/tags.json");
const tokenizerSource = process.env.NAIS3_TOKENIZER_PATH || path.join(path.dirname(source), "t5_tokenizer.json");
const outputDir = path.resolve(process.cwd(), "public/data");
const raw = readFileSync(source);
const rows = JSON.parse(raw.toString("utf8"));
const allowed = new Set(["general", "meta", "character", "copyright", "artist"]);
const seen = new Set();
let previous = Number.POSITIVE_INFINITY;

for (const [index, row] of rows.entries()) {
  if (typeof row.value !== "string" || !Number.isFinite(row.count) || !allowed.has(row.type)) {
    throw new Error(`invalid tag row ${index}`);
  }
  if (seen.has(row.value)) throw new Error(`duplicate tag: ${row.value}`);
  if (row.count > previous) throw new Error(`tag rows are not count-descending at ${index}`);
  seen.add(row.value);
  previous = row.count;
}

const typeCode = { general: 0, meta: 1, character: 2, copyright: 3, artist: 4 };
const compact = rows.map((row) => [row.value, row.count, typeCode[row.type]]);
mkdirSync(outputDir, { recursive: true });
writeFileSync(path.join(outputDir, "tags.json"), JSON.stringify(compact));
writeFileSync(
  path.join(outputDir, "tags.manifest.json"),
  JSON.stringify(
    {
      count: rows.length,
      sourceSha256: createHash("sha256").update(raw).digest("hex"),
      schema: "[tag,count,typeCode]",
      typeCodes: { 0: "general", 1: "meta", 2: "character", 3: "copyright", 4: "artist" },
    },
    null,
    2,
  ) + "\n",
);
copyFileSync(tokenizerSource, path.join(outputDir, "t5_tokenizer.json"));
console.log(`synced ${rows.length} tags`);
