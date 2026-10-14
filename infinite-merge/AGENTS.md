<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# ai-merge (인피니티 머지)

Word-alchemy game (Infinite Craft mechanic, 오행 start set) whose AI calls run on the signed-in user's ChatGPT plan via Sign in with ChatGPT — no API key.

## Commands

- `npm run dev` — dev server on `http://127.0.0.1:3000` (must be 127.0.0.1: SIWC only accepts loopback callbacks and cookies are per-host)
- `npm run dev:mock` — offline mock alchemy, no sign-in (`INFINITE_MERGE_AI=mock`)
- `npm test` (vitest), `npm run lint`, `npx tsc --noEmit`, `npm run build`

## Layout

- `lib/types.ts`, `lib/elements.ts` — client/server contract and base elements
- `lib/server/siwc/` — OAuth (dynamic registration, PKCE, JWKS), credential files, Responses SSE client
- `lib/server/alchemy/` — prompt, output parsing, recipe cache + combine, mock engine
- `lib/server/db.ts` — `node:sqlite`, D1-compatible schema; data in `.data/` (gitignored)
- `app/auth/*`, `app/api/*` — route handlers; `components/` — game UI (client)

## Rules

- Follow the plan-usage contract in https://developers.openai.com/siwc/llms-full.txt: `store:false`, `stream:true`, success only on `response.completed`, never send `temperature`/`max_output_tokens`/`metadata`/`user`/`previous_response_id`.
- Tokens stay server-side in `.data/credentials/*.json` (0600). Never log tokens or authorize URLs containing `id_token_hint`.
- Plan usage is approved for open-source/local apps only; hosted deployment needs OpenAI approval (interest form).
- `INFINITE_MERGE_AUTH_ORIGIN` / `INFINITE_MERGE_API_BASE` exist only to E2E-test against a local fake OpenAI server.
- Guest mode spends the operator's Anthropic credits (`claude-haiku-5-5`, key from `ANTHROPIC_API_KEY` passed explicitly, never the SDK's ambient credential chain). Every model call must go through `consumeGuestCall` (per-guest + global daily caps); cached recipes must stay free.
