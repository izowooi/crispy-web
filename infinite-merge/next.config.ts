import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // cacheComponents / partialPrefetching stay off: nothing here uses "use cache", and on Workers
  // OpenNext can hang PPR renders (opennextjs/opennextjs-cloudflare#1225).
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

// IM_D1=remote (npm run dev) binds DB to the deployed D1 database; anything else uses the local
// miniflare copy in .wrangler/state. Fake mock recipes must never reach the shared world.
const remoteD1 = process.env.IM_D1 === "remote";
if (remoteD1 && process.env.INFINITE_MERGE_AI === "mock") {
  throw new Error("INFINITE_MERGE_AI=mock is local-only: run `npm run dev:mock`, not against the shared D1 database.");
}
initOpenNextCloudflareForDev({ remoteBindings: remoteD1 });
