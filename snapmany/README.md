# SnapMany

한 장의 사진으로 7개 카테고리 15개 스타일의 변환 결과를 한 번에 생성하는 웹앱. Replicate `openai/gpt-image-2`를 백엔드로 사용하며, Next.js 16 + Tailwind v4 + Cloudflare Pages(edge runtime)로 빌드한다.

## 개발 절차

```bash
# 의존성 설치
npm install

# 개발 서버
npm run dev
# → http://localhost:3000

# 타입 / 린트 / 단위 테스트
npm run typecheck
npm run lint
npm run test
```

## 환경변수

`.env.example`을 복사해 `.env.local`을 만든 뒤 값을 채운다(`.env.local`은 `.gitignore`로 보호됨).

| 키 | 발급처 | 노출 범위 |
|----|--------|----------|
| `REPLICATE_API_TOKEN` | https://replicate.com/account/api-tokens | **서버 전용**(절대 `NEXT_PUBLIC_` 접두어 금지) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Console → Project settings → General | 클라이언트 노출 |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | 동상 | 클라이언트 노출 |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | 동상 | 클라이언트 노출 |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | 동상 | 클라이언트 노출 |
| `NEXT_PUBLIC_APP_ENV` | (수동) `development` / `production` | 클라이언트 노출 |

Firebase 4개 키는 `crispy-web` 프로젝트의 `snapmany` web app SDK config에서 추출한다.

## 빌드 / 배포

```bash
# Cloudflare Pages용 빌드 산출물 생성
npm run pages:build
# → .vercel/output/static/ 에 결과 생성

# 로컬 미리보기 (wrangler pages dev)
npm run preview
```

### Cloudflare Pages 배포 (수동 업로드)

본 MVP는 Cloudflare 자동 배포를 사용하지 않는다(Phase 1 D3 결정). 배포는 사용자가 직접 Cloudflare 대시보드에서 수행한다:

1. `npm run pages:build` 실행 후 생성된 `.vercel/output/static/` 디렉터리를 zip 또는 폴더 그대로 업로드한다.
2. Cloudflare 대시보드 → Workers & Pages → Create application → Pages → Upload assets.
3. Project name: `snapmany` (충돌 시 `snap-many` 폴백).
4. 환경변수 6개(`REPLICATE_API_TOKEN`, `NEXT_PUBLIC_FIREBASE_*` 4개, `NEXT_PUBLIC_APP_ENV`)를 Settings → Environment variables에 주입한다.

자동화된 `wrangler pages deploy`는 사용하지 않으며, `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN`도 채우지 않는다.

## 프로젝트 구조

```
src/
├── app/
│   ├── layout.tsx          # 다크모드 초기화 + 메타데이터
│   ├── page.tsx            # 메인 페이지(Phase 3에서 채워짐)
│   ├── globals.css         # Tailwind v4 + CSS 변수
│   └── api/generate/route.ts   # edge runtime, /api/generate POST
├── components/             # Phase 3 frontend
├── config/                 # 스타일 메타데이터(클라이언트)
├── lib/                    # 서버 전용 (Replicate, prompts)
└── __tests__/              # Vitest 단위 테스트
```

자세한 결정 사항은 `_workspace/00_architect_decisions.md`를 참고.
