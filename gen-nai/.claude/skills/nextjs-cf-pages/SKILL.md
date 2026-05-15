---
name: nextjs-cf-pages
description: Next.js 16 App Router + Tailwind v4 + Cloudflare Pages + Durable Objects 결합 가이드. wrangler 설정, @cloudflare/next-on-pages, Edge runtime, 시크릿 주입, gennai.pages.dev 배포 절차. Cloudflare Pages 배포 또는 next-on-pages 빌드 작업 시 반드시 이 스킬을 사용한다.
---

# nextjs-cf-pages

`gen-nai/web`을 Cloudflare Pages에 올리는 절차와 함정.

## 디렉토리 구조 (기본 권장)

```
gen-nai/web/
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── api/
│   │       ├── generate/route.ts        # POST: enqueue → jobId
│   │       └── job/[id]/route.ts        # GET: status
│   ├── components/
│   │   ├── CharacterSearch.tsx
│   │   ├── PromptEditor.tsx
│   │   ├── ImageSettings.tsx
│   │   ├── QueueStatus.tsx
│   │   └── Gallery.tsx
│   ├── lib/
│   │   ├── nai-payload.ts
│   │   ├── nai-client.ts
│   │   ├── character-search.ts
│   │   └── queue/NovelAiQueueDO.ts
│   └── types.ts
├── public/
│   └── characters.json
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── e2e/
├── scripts/
│   └── build-character-index.ts
├── wrangler.jsonc
├── package.json
├── tsconfig.json
├── next.config.ts
└── .dev.vars                            # 로컬 시크릿 (gitignored)
```

## 의존성 (최소)

```json
{
  "dependencies": {
    "next": "^16.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "fuse.js": "^7.0.0",
    "fflate": "^0.8.2",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@cloudflare/next-on-pages": "^1.13.0",
    "@cloudflare/workers-types": "^4.0.0",
    "wrangler": "^3.90.0",
    "typescript": "^5.6.0",
    "@types/react": "^19.0.0",
    "@types/node": "^22.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "vitest": "^2.1.0",
    "@vitest/coverage-v8": "^2.1.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.6.0",
    "jsdom": "^25.0.0",
    "msw": "^2.6.0",
    "@playwright/test": "^1.48.0"
  }
}
```

## next.config.ts

```ts
import type { NextConfig } from "next";
const config: NextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true }, // CF Pages는 next/image 최적화 없음
};
export default config;
```

## wrangler.jsonc (Pages + DO)

```jsonc
{
  "name": "gennai",
  "compatibility_date": "2026-01-01",
  "compatibility_flags": ["nodejs_compat"],
  "pages_build_output_dir": ".vercel/output/static",
  "durable_objects": {
    "bindings": [{ "name": "NOVELAI_QUEUE", "class_name": "NovelAiQueueDO" }]
  },
  "migrations": [{ "tag": "v1", "new_classes": ["NovelAiQueueDO"] }],
  "vars": { "MIN_INTERVAL_MS": "10000" }
}
```

## API 라우트 (Edge runtime + env 접근)

`@cloudflare/next-on-pages`의 `getRequestContext()` 사용:

```ts
// src/app/api/generate/route.ts
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function POST(req: Request) {
  const { env } = getRequestContext();
  const id = env.NOVELAI_QUEUE.idFromName("global");
  const stub = env.NOVELAI_QUEUE.get(id);
  const body = await req.text();
  return stub.fetch(new Request("https://do/enqueue", { method: "POST", body }));
}
```

## 환경변수 / 시크릿

| 변수 | 위치 | 비고 |
|------|------|------|
| `NAI_TOKEN` | `wrangler pages secret put NAI_TOKEN --project-name gennai` | 절대 Git에 X |
| `MIN_INTERVAL_MS` | `wrangler.jsonc` vars | 10000 |

로컬 개발: `gen-nai/web/.dev.vars` (gitignored)
```
NAI_TOKEN=pst-...
MIN_INTERVAL_MS=10000
```

## 로컬 개발

```bash
# 단순 Next 개발 (DO 동작 X — API 모킹 필요)
npm run dev

# Cloudflare 통합 모드 (DO 동작 O)
npm run pages:build      # next-on-pages 빌드
npx wrangler pages dev .vercel/output/static --kv KV --d1 D1
```

## 빌드 & 배포

```bash
# 1. 캐릭터 인덱스 빌드
npm run prebuild  # scripts/build-character-index.ts → public/characters.json

# 2. Next 빌드
npm run build

# 3. CF Pages용 변환
npx @cloudflare/next-on-pages

# 4. 배포
npx wrangler pages deploy .vercel/output/static --project-name gennai

# 5. 시크릿 설정 (1회만)
echo "$NAI_TOKEN" | npx wrangler pages secret put NAI_TOKEN --project-name gennai
```

도메인: `gennai.pages.dev` (자동), custom domain은 `wrangler pages deployment` GUI.

## 자주 만나는 함정

- **DO를 쓰려면 Pages Functions로는 부족** — `@cloudflare/next-on-pages`가 Worker로 변환해야 DO 바인딩 가능
- **`next/image` 최적화 OFF**: CF Pages는 sharp 미지원. `images.unoptimized = true`
- **Edge runtime 강제**: NAI 호출 API 라우트는 `export const runtime = "edge"` 필수. 아니면 DO 바인딩 못 씀
- **Node API 사용 시**: `compatibility_flags: ["nodejs_compat"]` 추가, 그래도 fs/path 일부는 미지원
- **WASM 크기 제한**: Worker 번들 1MB. fflate처럼 가벼운 라이브러리만 선택
- **시크릿 누출 검사**: `grep -r "pst-" .vercel/output dist || echo OK` — 매 배포 전

## 도메인 매핑

- 기본: `gennai.pages.dev` (배포 즉시 활성)
- Cloudflare DNS에 도메인 있으면 GUI에서 custom domain 추가 가능
- 본 프로젝트 1차 배포는 `gennai.pages.dev`만 사용
