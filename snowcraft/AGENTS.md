# AGENTS.md - Snowcraft (Layer 3)

이 문서는 `snowcraft` 프로젝트 전용 Layer 3 지침입니다.
상위 Layer 2 지침은 `../AGENTS.md`, 전역 Layer 1 지침은 `$HOME/git/AGENTS.md`입니다. 충돌하면 이 파일처럼 더 구체적인 하위 지침을 우선합니다.

## 프로젝트 개요

- 이 프로젝트는 과거 Flash 게임 Snowcraft를 브라우저에서 다시 플레이할 수 있게 복원한 Vite/TypeScript 정적 웹게임입니다.
- 배포 대상은 현재 폴더 `snowcraft/` 하나입니다. 과거 작업 흔적인 `snow-craft/`, `swf-bundle/`, `approach-*`, `decompiled/`, `observations/` 원본은 참고 자료일 뿐 배포 또는 커밋 대상으로 보지 않습니다.
- 원본 분석 자료가 필요하면 로컬 참조 경로 `$HOME/Downloads/snow-craft`를 읽되, 그 안의 파일을 이 저장소에 복사하지 않습니다.
- 이 앱은 Next.js가 아닙니다. Cloudflare Pages에서는 Vite 정적 사이트로 배포합니다.

## 구조

- `src/main.ts`: canvas bootstrapping, input wiring, title overlay shim, render loop.
- `src/core/`: Snowcraft gameplay rules, level config, player/AI/snowball logic.
- `src/render/`: sprite frame selection, pose clocks, canvas renderer.
- `src/input/`: pointer/mouse/touch input adapter.
- `src/audio/`: sound effect loading and playback shim.
- `public/assets/`: 런타임에 로드되는 이미지, sprite frames, sound files, manifest.
- `docs/spec/`: 원본 SWF/ActionScript 분석에서 파생된 gameplay spec.
- `tests/unit/`: Vitest unit tests.
- `tests/e2e/`: Playwright canvas regression tests.

## 기본 명령

```bash
npm install
npm run dev
npm run test
npm run build
npm run test:e2e
npm run preview
```

- `npm run build`는 `tsc && vite build`이며 Cloudflare Pages 배포 산출물은 `dist/`입니다.
- `npm run test:e2e`는 Playwright가 `npm run build` 후 `vite preview`를 `:4273`에서 띄워 검증합니다.
- `npm run dev`는 Vite 기본 개발 서버를 사용하며 기본 포트는 `5173`입니다.

## 구현 원칙

- 원본 재현을 깨지 않는 것이 최우선입니다. gameplay 상수, frame timing, HP, throw cadence, collision, level table을 바꿀 때는 `docs/spec/` 또는 decompiled ActionScript 근거를 같이 확인합니다.
- 원본 1-9레벨은 faithful port로 취급하고, 추가 캠페인 레벨은 `src/core/levelConfig.ts`의 확장 영역에서만 조정합니다.
- canvas stage는 원본 SWF 크기인 `592x320`을 기준으로 합니다. 렌더링 변경은 desktop과 좁은 viewport에서 실제 화면을 확인합니다.
- sprite/image/sound asset은 `public/assets/manifest.json`과 실제 파일이 함께 맞아야 합니다.
- 새 dependency는 보수적으로 추가합니다. 게임 로직은 작고 테스트 가능한 TypeScript 단위로 유지합니다.

## 검증 기준

- gameplay/core 변경: `npm run test`를 먼저 통과시킨 뒤 `npm run build`를 실행합니다.
- render/input/UI 변경: `npm run test:e2e` 또는 브라우저 수동 확인을 추가합니다.
- asset 변경: manifest 경로, 이미지 로딩, 사운드 fallback을 확인합니다.
- 문서만 수정한 경우 build/test를 생략할 수 있지만, 생략 사유를 작업 보고에 남깁니다.

## Cloudflare Pages 배포

- Cloudflare Pages의 프로젝트 root directory는 `snowcraft`로 설정합니다.
- Framework preset은 `Vite` 또는 `React (Vite)` 계열을 사용합니다.
- Build command는 `npm run build`, build output directory는 `dist`입니다.
- 환경변수는 현재 필요하지 않습니다. 나중에 추가하더라도 실제 `.env*` 파일은 커밋하지 않습니다.
- `dist/`, `node_modules/`, `test-results/`, `.wrangler/`, `.vercel/`, `.pages-out/`, 로그 파일은 커밋하지 않습니다.

## Git 주의사항

- 이 폴더의 실제 앱 소스, 테스트, 문서, `package.json`, `package-lock.json`, 설정 파일만 stage합니다.
- `snow-craft/` 삭제는 과거 reverse-engineering bundle 제거로 보고 함께 커밋할 수 있습니다.
- 루트나 sibling app의 변경은 요청 범위와 직접 관련이 있을 때만 stage합니다.
- 커밋 전 `git diff --staged`로 민감 정보와 불필요한 파일이 없는지 확인합니다.
