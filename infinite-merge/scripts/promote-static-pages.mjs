/**
 * Serve fully static routes straight from Workers Static Assets instead of the Next.js server.
 * Assets that match a path are answered without invoking the Worker: no CPU time (Free allows 10 ms per
 * request; rendering "/" through OpenNext measured 18–119 ms) and no count against the daily request quota.
 * Only routes that `next build` prerendered as static (○) belong here.
 */
import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const app = join(process.cwd(), ".next", "server", "app");
const assets = join(process.cwd(), ".open-next", "assets");
const STATIC_ROUTES = [
  { from: "index.html", to: "index.html" },
  { from: "icon.svg.body", to: "icon.svg" },
];

if (!existsSync(assets)) throw new Error("Run opennextjs-cloudflare build first: .open-next/assets is missing.");
for (const { from, to } of STATIC_ROUTES) {
  const source = join(app, from);
  if (!existsSync(source)) throw new Error(`Expected a prerendered ${from}; is the route still static?`);
  copyFileSync(source, join(assets, to));
}
console.log(`Promoted ${STATIC_ROUTES.length} prerendered route(s) to static assets: ${STATIC_ROUTES.map((r) => "/" + r.to.replace("index.html", "")).join(", ")}`);
