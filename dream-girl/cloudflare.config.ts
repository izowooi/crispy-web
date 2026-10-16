import { bindings, defineConfig } from "cf/config";
import * as entrypoint from "./worker/index.js" with { type: "cf-worker" };

export default defineConfig({
  accountId: "ad6fadce86c3f6dc91626ae088baaa84",
  worker: {
    name: "dream-girl",
    compatibilityDate: "2026-10-09",
    entrypoint,
    domains: ["dg.zowoo.uk", "dreamgirl.zowoo.uk"],
    assets: {
      notFoundHandling: "single-page-application",
      runWorkerFirst: ["/api/*", "/images/*"],
    },
    env: {
      ASSETS: { type: "assets" },
      DB: bindings.d1({
        name: "dream-girl",
        id: "c1927a68-2d2c-4fb4-8c42-0c29c2a16258",
      }),
      IMAGES: bindings.r2({ name: "dream-girl" }),
      API_LIMITER: bindings.rateLimit({
        namespace: "3201",
        simple: { limit: 120, period: 60 },
      }),
    },
  },
});
