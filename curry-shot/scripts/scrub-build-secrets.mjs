/**
 * OpenNext compiles values from local env files into a server-only fallback
 * module. Curry Shot relies on Cloudflare runtime bindings instead, so paid API
 * credentials must never remain as literals in any deployable build artifact.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const sensitiveKeys = new Set([
  "OPENAI_API_KEY",
  "REPLICATE_API_KEY",
  "REPLICATE_API_TOKEN",
  "CURRY_SHOT_ACCESS_CODE",
]);

const candidates = [
  join(process.cwd(), ".open-next", "cloudflare", "next-env.mjs"),
];

let scrubbedFiles = 0;
for (const file of candidates) {
  if (!existsSync(file)) continue;
  const nextSource = readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^export const (production|development|test) = (\{.*\});$/);
      if (!match) throw new Error(`Unexpected OpenNext env module shape: ${file}`);
      const values = JSON.parse(match[2]);
      for (const key of sensitiveKeys) delete values[key];
      return `export const ${match[1]} = ${JSON.stringify(values)};`;
    })
    .join("\n");
  writeFileSync(file, `${nextSource}\n`, "utf8");
  scrubbedFiles += 1;
}

if (scrubbedFiles === 0) {
  throw new Error("OpenNext env module was not found; refusing an unverifiable build.");
}

console.log(`Scrubbed sensitive runtime bindings from ${scrubbedFiles} build env module(s).`);
