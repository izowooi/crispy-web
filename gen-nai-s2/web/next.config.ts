import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const config: NextConfig = { images: { unoptimized: true } };
export default config;

initOpenNextCloudflareForDev();
