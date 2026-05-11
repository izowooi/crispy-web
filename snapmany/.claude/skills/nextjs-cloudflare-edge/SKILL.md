---
name: nextjs-cloudflare-edge
description: Next.js 16 App Router를 Cloudflare Pages에 배포할 때의 필수 규칙(edge runtime, Tailwind v4, @cloudflare/next-on-pages, wrangler) 모음. snapmany의 어떤 route handler든 작성/수정할 때, Tailwind 설정을 만질 때, Cloudflare 빌드/배포가 실패할 때 반드시 트리거한다. "edge runtime", "Cloudflare Pages", "pages:build", "wrangler", "Tailwind v4", "globals.css" 키워드가 보이면 이 스킬을 사용한다.
---

# Next.js 16 + Cloudflare Pages + Tailwind v4

snapmany는 Next.js 16을 Cloudflare Pages에 `@cloudflare/next-on-pages`로 배포한다. 이 조합에는 양보 불가능한 규칙이 몇 가지 있다. 위반하면 빌드 또는 배포가 깨진다.

## 규칙 1: 모든 API route는 edge runtime

`src/app/api/**/route.ts`에 있는 모든 파일의 최상단에 **반드시** 다음 한 줄이 들어간다.

```ts
export const runtime = 'edge';
```

빠뜨리면 빌드가 다음과 같이 깨진다:
> The following routes were not configured to run with the Edge Runtime

새 route handler를 만들거나, 기존 route handler를 수정할 때 가장 먼저 이 라인의 존재를 확인한다. 없으면 추가하고, 있으면 절대 지우지 않는다.

## 규칙 2: Tailwind v4 import 방식

`src/app/globals.css`의 첫 줄은:

```css
@import "tailwindcss";
```

구버전 디렉티브는 v4에서 동작하지 않는다. **금지:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`postcss.config.mjs`는 v4 플러그인을 사용한다:
```js
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

## 규칙 3: package.json 스크립트

ductcanvas 패턴을 따른다:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "pages:build": "npx @cloudflare/next-on-pages@1",
    "preview": "npm run pages:build && npx wrangler pages dev .vercel/output/static",
    "deploy": "npm run pages:build && npx wrangler pages deploy .vercel/output/static --project-name snapmany"
  }
}
```

## 규칙 4: edge runtime 호환 패키지 선택

edge runtime은 Node.js API를 전부 지원하지 않는다. 다음 패턴을 피한다:
- `fs`, `path` 같은 Node 빌트인 (불가)
- 동기 crypto (`crypto.createHash` 등) — 대신 `crypto.subtle` 사용
- `Buffer.from(..., 'base64')` 대신 `atob` / `Uint8Array`로 처리

Replicate SDK(`replicate@^1.4.0`)는 edge 호환. Firebase 클라이언트 SDK도 edge 호환. Firebase **Admin** SDK는 edge에서 동작하지 않으므로 사용 금지 (서버에서 admin 권한이 필요한 작업이 생기면 architect와 상의).

## 규칙 5: Next.js 16 변경사항 주의

Next.js 16은 13/14와 API가 다르다. 알 수 없는 동작이 보이면 `node_modules/next/dist/docs/`의 가이드를 먼저 읽는다 (ductcanvas/AGENTS.md 명시).

특히 다음은 13/14와 다르다:
- `params`와 `searchParams`가 비동기(Promise) — `await params`
- `cookies()`, `headers()`도 비동기
- Image 컴포넌트 props 일부 변경

## 규칙 6: 환경변수 노출 경계

- 서버 전용: 접두어 없이 사용 (`REPLICATE_API_TOKEN`, `CLOUDFLARE_*`)
- 클라이언트 노출: `NEXT_PUBLIC_*` 접두어 (Firebase config 등)
- **Replicate 토큰에 `NEXT_PUBLIC_` 접두어를 절대 붙이지 않는다.**

## 규칙 7: 이미지 도메인 등록

`next.config.ts`의 `images.remotePatterns`에 Replicate 도메인을 등록한다:

```ts
images: {
  remotePatterns: [
    { protocol: 'https', hostname: 'replicate.delivery' },
  ],
}
```

또는 `<Image>` 대신 `<img>`를 쓰면 도메인 등록 불필요 (MVP에서 단순화 옵션).

## 규칙 8: wrangler 설정 최소 형태

`wrangler.jsonc`:
```jsonc
{
  "name": "snapmany",
  "compatibility_date": "2025-04-01",
  "compatibility_flags": ["nodejs_compat"],
  "pages_build_output_dir": ".vercel/output/static"
}
```

`compatibility_date`는 최신 안정 날짜로. `nodejs_compat`은 일부 패키지(특히 Firebase)가 polyfill을 요구할 수 있어 미리 켜둔다.

## 디버깅 체크리스트

`npm run pages:build`가 실패하면:
1. edge runtime export 누락 — 가장 흔함
2. Node-only API 사용 (`fs`, `Buffer` 등)
3. 동적 import 대상이 edge 비호환
4. 환경변수 빌드시 미주입 (`.env.local`은 빌드시 읽힘, Cloudflare 배포는 대시보드에 주입 필요)

`wrangler pages dev`로 로컬 부팅 실패하면:
1. `pages_build_output_dir` 경로 오타
2. `compatibility_date` 형식 오류
3. KV/D1 바인딩 누락 (현재 MVP에서는 없음)
