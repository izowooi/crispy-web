#!/usr/bin/env node
// One-time scaffold of the Safari Web Extension Xcode project under safari/.
//
// Reference mode: we deliberately OMIT --copy-resources, so the generated Xcode project
// REFERENCES ../dist instead of copying it. That keeps src/ the single source of truth —
// `npm run build` regenerates dist/, and rebuilding the app target in Xcode picks it up.
// No copy/sync step is needed.
//
// macOS + Xcode required. For personal/local use no paid Apple Developer account is
// needed — see docs/SAFARI.md for the unsigned-run steps.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(root, "dist");
const safariDir = join(root, "safari");

const APP_NAME = process.env.SAFARI_APP_NAME ?? "Page Share";
const BUNDLE_ID = process.env.SAFARI_BUNDLE_ID ?? "com.izowooi.pageshare";

if (!existsSync(join(distDir, "manifest.json"))) {
  console.error("✗ dist/manifest.json not found. Run `npm run build` first.");
  process.exit(1);
}

console.log(`Scaffolding Safari project → safari/  (app="${APP_NAME}", id=${BUNDLE_ID})`);
try {
  execFileSync(
    "xcrun",
    [
      "safari-web-extension-converter",
      distDir,
      "--project-location", safariDir,
      "--app-name", APP_NAME,
      "--bundle-identifier", BUNDLE_ID,
      "--macos-only",
      "--no-open",
      "--no-prompt",
      "--force",
    ],
    { stdio: "inherit" },
  );
} catch {
  console.error("✗ converter failed. Ensure Xcode is installed: xcode-select -p");
  process.exit(1);
}

// The converter derives the app's bundle id from the app name ("Page Share" →
// com.izowooi.Page-Share) while the extension uses <BUNDLE_ID>.Extension, so the
// extension id is NOT prefixed by the app id and embedding fails to build. Normalize
// every PRODUCT_BUNDLE_IDENTIFIER to BUNDLE_ID / BUNDLE_ID.Extension.
const pbxproj = join(safariDir, APP_NAME, `${APP_NAME}.xcodeproj`, "project.pbxproj");
if (existsSync(pbxproj)) {
  const fixed = readFileSync(pbxproj, "utf8").replace(
    /PRODUCT_BUNDLE_IDENTIFIER = "?([^";]+)"?;/g,
    (_m, id) => `PRODUCT_BUNDLE_IDENTIFIER = ${BUNDLE_ID}${id.endsWith(".Extension") ? ".Extension" : ""};`,
  );
  writeFileSync(pbxproj, fixed);
  console.log("  Normalized bundle identifiers: " + BUNDLE_ID + " / " + BUNDLE_ID + ".Extension");
}

console.log(
  "\n✓ Safari project scaffolded.\n" +
    "  Open in Xcode:  open safari/*/*.xcodeproj\n" +
    "  Then build/run the app target once, enable the extension in Safari Settings,\n" +
    "  and (for unsigned dev) Develop ▸ Allow Unsigned Extensions. See docs/SAFARI.md.",
);
