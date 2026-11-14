import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

// public/_headers의 CSP는 index.html 인라인 스크립트를 해시로만 허용한다.
// 스크립트를 고치고 해시 갱신을 잊으면 배포본이 하얀 화면이 되므로 빌드에서 막는다.
function cspHashGuard(): Plugin {
  return {
    name: "zkeep-csp-hash-guard",
    apply: "build",
    enforce: "post",
    writeBundle(_options, bundle) {
      const html = bundle["index.html"];
      if (!html || html.type !== "asset") return;
      const source = String(html.source);
      const headers = readFileSync(new URL("./public/_headers", import.meta.url), "utf8");
      for (const [, body] of source.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
        const hash = `'sha256-${createHash("sha256").update(body).digest("base64")}'`;
        if (!headers.includes(hash)) {
          this.error(`public/_headers의 script-src에 인라인 스크립트 해시 ${hash}가 없습니다`);
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare(), cspHashGuard()],
  build: { modulePreload: { polyfill: false } },
});
