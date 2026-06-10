# AGENTS.md — page-share-ext (L4)

이 문서는 `crispy-web/page-share-ext` Chrome 익스텐션의 L4 작업 지침입니다.
상위 L3 지침은 `crispy-web/AGENTS.md`, 전역 L1 지침은 `$HOME/git/AGENTS.md`를 따릅니다.

## 앱 개요

Manifest V3 Chrome/Opera 익스텐션.
사용자가 팝업에서 "Save Page"를 클릭하면 현재 페이지를 SingleFile 스타일로 캡처해
`page-share` 웹 앱 API에 업로드하고 공유 URL을 돌려받습니다.

## 기술 스택

- Chrome Extension Manifest V3
- TypeScript + Webpack 5 (`ts-loader`)
- Vitest + jsdom (테스트)
- 빌드 출력: `dist/` (gitignored)

## 아키텍처

```
popup.ts  ──[sendMessage CAPTURE_PAGE]──▶  content/index.ts
                                                │ (DOM capture + image/CSS inline)
popup.ts  ◀──[CAPTURE_DONE payload]──────────────
    │
    └──[sendMessage CAPTURE_DONE]──▶  background/index.ts
                                            │ (POST /api/archives)
popup.ts  ◀──[UPLOAD_DONE share_url]────────
```

## 컴포넌트별 역할

| 파일 | 역할 |
|------|------|
| `src/popup/popup.ts` | UI 제어, 메시지 오케스트레이션 |
| `src/content/index.ts` | DOM cloneNode → 이미지 inline → CSS inline → script 제거 |
| `src/background/index.ts` | `POST /api/archives` fetch |
| `src/shared/config.ts` | API base URL (`chrome.storage.sync` 저장/로드) |
| `src/shared/types.ts` | Message 유니언 타입 |

## API 연동

- 기본 API URL: `http://localhost:3000` (팝업 하단에서 변경 가능)
- `chrome.storage.sync`에 `apiBase` 키로 저장
- POST body: `{ title, original_url, html }`
- 응답: `{ archive: {...}, share_url: "..." }`

## 빌드 및 설치

```bash
cd page-share-ext
npm install
npm run build   # dist/ 생성
```

Chrome에서 익스텐션 설치:
1. `chrome://extensions/` → 개발자 모드 활성화
2. "압축 해제된 확장 프로그램 로드" → `dist/` 폴더 선택

Opera도 동일한 방법으로 설치 가능 (`opera://extensions/`).

## 테스트

```bash
npm run test    # vitest run (jsdom 환경)
```

- `src/__tests__/sanitize.test.ts`: DOM 기반 script/이벤트핸들러 제거 검증

content script 로직 (`capturePage`)은 실제 Chrome API(`chrome.runtime.sendMessage`) 없이
단위 테스트하기 어려우므로, 핵심 변환 함수(`removeScripts`, `inlineImages` 등)를
별도 모듈로 분리해 테스트할 것을 권장합니다.

## 주의 사항

- **content script**는 페이지 컨텍스트에서 실행되므로 `console.log`가 해당 페이지의 DevTools에 출력됩니다.
- **service worker** (`background/index.ts`)는 비활성 시 종료됩니다. 긴 업로드는 `chrome.tabs.onUpdated` 등으로 유지 필요.
- 이미지 inline 중 외부 이미지 CORS 오류는 조용히 무시하고 원본 src를 유지합니다.
- 팝업에서 API URL을 `page-share` 웹 앱 주소로 변경해야 합니다.

## 아이콘 준비

`icons/` 폴더에 `icon16.png`, `icon48.png`, `icon128.png`이 필요합니다.
현재 placeholder 없이 `noErrorOnMissing: true`로 설정돼 있어 빌드는 통과하지만,
크롬에서 로드 시 기본 아이콘이 표시됩니다. 실제 배포 전 추가하세요.
