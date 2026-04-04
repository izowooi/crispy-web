/**
 * Assembles the Cloudflare Pages deployment directory.
 *
 * @opennextjs/cloudflare outputs:
 *   .open-next/assets/       <- static files
 *   .open-next/worker.js     <- worker (imports from sibling dirs)
 *   .open-next/cloudflare/   <- cloudflare helpers
 *   .open-next/middleware/   <- middleware handler
 *   .open-next/server-functions/ <- server request handler
 *
 * wrangler needs _worker.js AND all its imported modules in the same dir.
 * So we assemble everything into .pages-out/:
 *   .pages-out/_worker.js
 *   .pages-out/cloudflare/
 *   .pages-out/middleware/
 *   .pages-out/server-functions/
 *   .pages-out/_next/  (static assets)
 *   .pages-out/...     (other static files)
 */

import { cpSync, rmSync, mkdirSync, copyFileSync } from "fs";
import { join } from "path";

const root = process.cwd();
const openNext = join(root, ".open-next");
const out = join(root, ".pages-out");

// Clean and recreate output directory
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// Copy static assets (contents only, not the assets/ dir itself)
cpSync(join(openNext, "assets"), out, { recursive: true });

// Copy server-side modules needed by worker.js (including hidden .build dir)
for (const dir of ["cloudflare", "middleware", "server-functions", ".build"]) {
  cpSync(join(openNext, dir), join(out, dir), { recursive: true });
}

// Place worker.js as _worker.js at root
copyFileSync(join(openNext, "worker.js"), join(out, "_worker.js"));

console.log("✓ Pages deployment assembled at .pages-out/");
