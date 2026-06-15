#!/usr/bin/env node
// Package dist/ into a store-submission zip: packages/page-share-ext-v<version>.zip
//
// Uses the system `zip` (preinstalled on macOS/Linux) so no extra npm dependency is
// needed. The same zip is valid for Chrome Web Store, Edge Add-ons, and Opera Addons —
// the MV3 manifest is identical across all three Chromium stores.
//
// Excludes *.map because webpack runs with devtool:"source-map" and DefinePlugin bakes
// the R2 credentials into the bundle; source maps would expose those secret strings.
import { execFileSync } from "node:child_process";
import { mkdirSync, existsSync, readFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(root, "dist");
const outDir = join(root, "packages");

if (!existsSync(join(distDir, "manifest.json"))) {
  console.error("✗ dist/manifest.json not found. Run `npm run build` first.");
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(join(distDir, "manifest.json"), "utf8"));
const version = manifest.version ?? "0.0.0";

// A build with R2 credentials baked in embeds a secret in the bundle JS itself —
// never publish such a build to a public store. Warn without printing the secret.
try {
  const cfg = JSON.parse(readFileSync(join(root, "config.local.json"), "utf8"));
  const secret = String(cfg.r2Secret ?? "").trim();
  if (secret && !secret.startsWith("<")) {
    console.warn(
      "\n⚠️  config.local.json contains an R2 secret — it is embedded in the build bundle.\n" +
        "    Do NOT upload this zip to a public store. For store submission, clear the r2*\n" +
        "    fields in config.local.json and rebuild (server-upload fallback mode).\n",
    );
  }
} catch {
  // No config.local.json → server-mode build, safe to publish.
}

mkdirSync(outDir, { recursive: true });
const zipName = `page-share-ext-v${version}.zip`;
const zipPath = join(outDir, zipName);
rmSync(zipPath, { force: true }); // `zip` appends to an existing archive; start clean.

try {
  // Zip dist/ CONTENTS so manifest.json sits at the archive root (stores require this).
  execFileSync(
    "zip",
    ["-r", "-X", "-q", zipPath, ".", "-x", "*.map", "-x", ".DS_Store", "-x", "*/.DS_Store"],
    { cwd: distDir, stdio: ["ignore", "inherit", "inherit"] },
  );
} catch {
  console.error("✗ `zip` failed. Ensure the `zip` CLI is installed (preinstalled on macOS/Linux).");
  process.exit(1);
}

console.log(
  `✓ packages/${zipName}\n` +
    "  Same file uploads to Chrome Web Store, Edge Add-ons, and Opera Addons.",
);
