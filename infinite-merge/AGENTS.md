<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# ai-merge (인피니티 머지)

Word-alchemy game (Infinite Craft mechanic, 오행 start set). Hosted at https://merge.zowoo.uk on Cloudflare Workers (OpenNext) + D1 with guest play on the operator's Claude Haiku credits; local runs can also use the player's own ChatGPT plan via Sign in with ChatGPT (SIWC).

## Commands

- `npm run dev` — `http://127.0.0.1:3000` against the **remote (production) D1**, shared with the hosted site (`IM_D1=remote`). Must be 127.0.0.1: SIWC only accepts loopback callbacks.
- `npm run dev:local` / `npm run dev:mock` — local D1 copy in `.wrangler/state` (applies migrations first); mock = offline fake alchemy, never against remote (next.config.ts refuses).
- `npm test` (vitest), `npm run lint`, `npm run typecheck`
- `npm run preview` — OpenNext build + workerd on 127.0.0.1:8787 with local D1. Run it before deploying: Workers-only bugs do not show up in `next dev`.
- `npm run db:migrate:local|remote`, `npm run deploy`
- Learning labs: `npm run lab:d1|lab:size|lab:clone-remote|lab:hammer` (docs in `docs/learn/`)

## Layout

- `lib/types.ts`, `lib/elements.ts` — client/server contract and base elements
- `lib/server/db.ts` — `getDb()` returns the D1 binding `env.DB`; schema lives only in `migrations/*.sql` (tables prefixed `im_`)
- `lib/server/guard.ts` — same-origin check, Rate Limiting bindings, IP hashing, Turnstile verification
- `lib/server/guest/` — Claude Haiku client and D1 daily quotas
- `lib/server/siwc/` — OAuth (dynamic registration, PKCE, JWKS), credential files, Responses SSE client
- `lib/server/alchemy/` — prompt, output parsing, recipe cache + combine, mock engine
- `app/auth/*`, `app/api/*` — route handlers; `components/` — game UI (client)
- `tests/support/d1.ts` — node:sqlite D1 shim used by vitest; keep it faithful to real D1
- `scripts/` — Cloudflare build steps (static page promotion, secret scrub/verify)
- `docs/HOSTING.md` — hosting decisions and ops; `docs/learn/` + `learn/` — tutorials and lab tools

## Rules

- Schema changes: add a new `migrations/NNNN_*.sql` (never edit an applied one), keep the `im_` prefix, apply remote before deploying code that needs it.
- D1 has no BEGIN/COMMIT: use `db.batch([...])` for atomic multi-statement writes. Detect "inserted?" with `INSERT … RETURNING`, not `meta.changes` (D1 counts trigger-touched rows, e.g. an `im_elements` insert reports 2).
- `npm run dev` writes to production data. Destructive experiments go to `dev:local` or `lab:clone-remote`.
- Pinned versions: `next` 16.3.8 (16.4.0 breaks OpenNext 1.20.11, opennextjs-cloudflare#1448) and `cacheComponents` off (#1225). Check `npm view @opennextjs/cloudflare peerDependencies` before upgrading Next.
- New secrets: add them to `scripts/scrub-build-secrets.mjs` and `scripts/verify-build-secrets.mjs`; set with `wrangler secret put` (pipe, never echo). Public settings go in `wrangler.jsonc` `vars`.
- Keep `placement` (aws:ap-northeast-2): Anthropic returns 403 from the HKG colo.
- Guest mode spends the operator's Anthropic credits (`claude-haiku-5-5`, key from `ANTHROPIC_API_KEY` passed explicitly, never the SDK's ambient credential chain). Every model call must go through `consumeGuestCall` (global, per-guest, per-IP daily caps); cached recipes must stay free. Cheap checks (same-origin, rate limit) run before any D1 or model work.
- SIWC: follow https://developers.openai.com/siwc/llms-full.txt (`store:false`, `stream:true`, success only on `response.completed`, never send `temperature`/`max_output_tokens`/`metadata`/`user`/`previous_response_id`). Tokens stay in `.data/credentials/*.json` (0600), never in D1, never logged. Plan usage is approved for local/open-source runs only: SIWC routes 404 on non-loopback hosts and the UI hides it (`StateResponse.siwc`).
- `INFINITE_MERGE_AUTH_ORIGIN` / `INFINITE_MERGE_API_BASE` exist only to E2E-test against a local fake OpenAI server.
- Committed docs must not contain account IDs, emails, or absolute home paths.
