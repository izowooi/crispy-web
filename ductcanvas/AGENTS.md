<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Cloudflare Pages Deployment Rules

This project is deployed to Cloudflare Pages via `@cloudflare/next-on-pages`.

**Every API route MUST export the edge runtime:**
```ts
export const runtime = 'edge';
```

Without this, the build fails with:
> The following routes were not configured to run with the Edge Runtime

Apply this to every file under `src/app/api/**/route.ts` when creating or modifying API routes.
