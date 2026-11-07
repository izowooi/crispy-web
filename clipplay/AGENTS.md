# AGENTS.md — clipplay (Layer 3)

이 문서는 `clipplay` 프로젝트에 적용되는 Layer 3 작업 지침이다.
상위 Layer 2 지침은 `../AGENTS.md`를 따른다.

## 프로젝트 개요

ClipPlay는 가족용 세로형 동영상 스트리밍 앱이다(`https://clipplay.zowoo.uk`). Next.js 16 기반 TikTok 형태의 UI를 제공하고, 동영상은 맥미니(.173) 로컬 디스크에 저장해 Cloudflare Tunnel로 서빙한다. 시청은 공개, 업로드·수정·삭제는 Google OAuth + `ADMIN_EMAILS` allowlist로 제한한다. R2와 Cloudflare Pages는 더 이상 쓰지 않는다.

## 실행과 검증

```bash
npm run dev
npm run lint
npm run test
npm run build
```

추가 테스트 명령은 다음과 같다.

```bash
npm run test:ui
npm run test:coverage
```

## 아키텍처

```text
React 19 + Tailwind CSS 4 client
  → Cloudflare Edge (/media 캐시) → Cloudflare Tunnel
  → Next.js 16 `next start` (pm2 `clipplay`, 127.0.0.1:5110, Node runtime)
  → CLIPPLAY_DATA_DIR (metadata.json, videos/, thumbnails/)
  → Google OAuth 2.0 + 7일 HttpOnly JWT session
```

## 주요 경로

- `src/app/`: App Router 페이지와 API route.
- `src/app/api/auth/`: Google OAuth login, callback, logout, 사용자 조회.
- `src/app/api/admin/`: presign(키 예약), files(청크 업로드), upload(메타데이터), clip CRUD 등 보호 API.
- `src/app/api/clips/`: 공개 클립 목록(관리자면 비공개 포함). `src/app/media/`: Range 지원 미디어 서빙.
- `src/app/admin/`: 보호된 관리 화면.
- `src/components/`: player, clip, 공통 UI.
- `src/hooks/`: 인증, clip, theme, video player hook.
- `src/lib/`: OAuth, `storage/`(로컬 디스크 metadata·파일·키 검증), clip 처리 utility.
- `src/types/`: TypeScript interface.
- `__tests__/`: Vitest, React Testing Library, MSW 테스트.

## 데이터와 인증

- 모든 동영상 metadata는 `CLIPPLAY_DATA_DIR/metadata.json`에 저장한다. 쓰기는 in-process 큐 + 임시파일 rename + `.bak`로 처리하므로 pm2는 단일 fork 인스턴스를 유지한다.
- `/media`는 `videos/`, `thumbnails/` 키만 서빙한다. `metadata.json`은 절대 노출하지 않는다.
- 업로드는 Cloudflare 본문 100MB 제한 때문에 32MB 청크 PUT으로 받고, 완료 시 ffmpeg `+faststart` 후 원자적으로 공개한다.
- 관리자 allowlist는 env `ADMIN_EMAILS`다(metadata의 `allowedUploaders`는 더 이상 쓰지 않음). 세션의 `isAdmin` claim은 신뢰하지 않고 매 요청 allowlist로 재확인한다.
- `src/middleware.ts`가 `/admin/*` 페이지를 1차 보호하고, API는 각 route에서 관리자 확인을 한다.

## 환경 변수

브라우저 공개 값(빌드 시점 고정):

- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_BASE_URL`

서버 전용 값:

- `GOOGLE_CLIENT_SECRET`
- `JWT_SECRET` (32자 이상, 없으면 세션 발급 실패)
- `ADMIN_EMAILS`
- `CLIPPLAY_DATA_DIR`

실제 값은 출력하거나 커밋하지 않는다.

## 배포

맥미니 `/Volumes/sn850x/git/crispy-web/clipplay`에서 `git pull` → `npm ci` → `npm run build` → `pm2 startOrRestart ecosystem.config.cjs`. 비밀값은 그 폴더의 `.env.local`(미추적). 재부팅 대비 LaunchAgent는 `deploy/dev.clipplay.pm2.plist`. Tunnel ingress는 원격 관리형 tunnel `open`에 `clipplay.zowoo.uk → http://127.0.0.1:5110`. 자세한 절차는 README의 배포 섹션을 따른다.
