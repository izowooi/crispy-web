// Bindings declared in wrangler.jsonc, as seen by getCloudflareContext().env.
import type { D1Database, RateLimit } from "@cloudflare/workers-types";

declare global {
  interface CloudflareEnv {
    DB: D1Database;
    /** Burst limit on /api/combine per hashed IP. Absent under plain `next dev` unless miniflare provides it. */
    COMBINE_LIMITER?: RateLimit;
    /** Burst limit on /auth/guest per hashed IP. */
    GUEST_START_LIMITER?: RateLimit;
  }
}

export {};
