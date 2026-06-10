import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  // NOTE: upload/raw routes use Node.js runtime (local filesystem).
  // Switch to R2Adapter + edge runtime before deploying to Cloudflare Pages.
};

export default nextConfig;
