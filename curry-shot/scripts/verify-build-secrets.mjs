/** Fail the build if a local credential value survives in deploy artifacts. */
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { basename, join, relative } from "node:path";

const root = process.cwd();
const sensitiveKeys = [
  "OPENAI_API_KEY",
  "REPLICATE_API_KEY",
  "REPLICATE_API_TOKEN",
  "CURRY_SHOT_ACCESS_CODE",
];

function parseEnvFile(file) {
  if (!existsSync(file)) return new Map();
  const values = new Map();
  for (const rawLine of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    if (!sensitiveKeys.includes(key)) continue;
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (value.length >= 8) values.set(key, value);
  }
  return values;
}

const secretValues = new Map();
const envFileNames = readdirSync(root).filter((fileName) => (
  fileName === ".env" ||
  fileName === ".dev.vars" ||
  ((fileName.startsWith(".env.") || fileName.startsWith(".dev.vars.")) &&
    !fileName.endsWith(".example") &&
    !fileName.endsWith(".sample"))
));
for (const fileName of envFileNames) {
  for (const [key, value] of parseEnvFile(join(root, fileName))) {
    secretValues.set(key, value);
  }
}
for (const key of sensitiveKeys) {
  const value = process.env[key]?.trim();
  if (value && value.length >= 8) secretValues.set(key, value);
}

function* walk(directory) {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (entry.isFile()) yield path;
  }
}

const artifactRoots = [join(root, ".open-next")];
const findings = [];

for (const artifactRoot of artifactRoots) {
  for (const file of walk(artifactRoot)) {
    if (statSync(file).size > 32 * 1024 * 1024) continue;
    const bytes = readFileSync(file);
    for (const [key, value] of secretValues) {
      if (bytes.includes(Buffer.from(value))) {
        findings.push(`${key} in ${relative(root, file)}`);
      }
    }
  }
}

const assetRoot = join(root, ".open-next", "assets");
for (const file of walk(assetRoot)) {
  if (statSync(file).size > 8 * 1024 * 1024) continue;
  const content = readFileSync(file);
  for (const key of sensitiveKeys) {
    if (content.includes(Buffer.from(key))) {
      findings.push(`sensitive key name ${key} in public asset ${relative(root, file)}`);
    }
  }
}

if (findings.length > 0) {
  throw new Error(`Sensitive build artifact detected:\n${findings.join("\n")}`);
}

if (!existsSync(join(root, ".open-next", "worker.js"))) {
  throw new Error("OpenNext Worker entrypoint is missing.");
}
if (existsSync(join(root, ".pages-out"))) {
  throw new Error("Obsolete .pages-out artifact must not exist after a Workers build.");
}

console.log(
  `Verified ${basename(join(root, ".open-next"))}: no configured credential values in deploy artifacts or key names in public assets.`,
);
