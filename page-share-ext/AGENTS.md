# AGENTS.md — page-share-ext (L4)

이 문서는 `crispy-web/page-share-ext` Chrome 익스텐션의 L4 작업 지침입니다.
상위 L3 지침은 `crispy-web/AGENTS.md`, 전역 L1 지침은 `$HOME/git/AGENTS.md`를 따릅니다.

## 앱 개요

Manifest V3 익스텐션. **Chrome · Edge · Opera · Safari** 4개 브라우저를 하나의 `src/`로 지원합니다.
사용자가 팝업에서 "Save Page"를 클릭하면 현재 페이지를 SingleFile 스타일로 캡처해
Cloudflare R2에 직접 업로드하거나(R2 설정 시), `page-share` 웹 앱 API에 전달합니다.

크로스 브라우저 상세는 `docs/CROSS_BROWSER.md`, Safari 포팅은 `docs/SAFARI.md`를 참조합니다.

## 기술 스택

- Manifest V3 (Chrome 90+ / Edge 90+ / Opera 76+ / Safari 16.4+)
- TypeScript + Webpack 5 (`ts-loader`)
- `aws4fetch` — SigV4 서명 (R2 업로드용, ~15KB 번들 추가)
- Vitest + jsdom (테스트)
- 빌드 출력: `dist/` (gitignored). Chromium 3종이 동일 `dist/`를 공유하고, Safari `safari/` Xcode 래퍼는 reference mode로 `dist/`를 가리킵니다.
- 신규 dependency 없음. 크로스 브라우저 메시징은 `webextension-polyfill` 대신 dep-free shim(`src/shared/messaging.ts`)으로 처리 — 판단 근거는 `docs/CROSS_BROWSER.md`.

## 아키텍처

```
popup.ts  ──[sendMessage CAPTURE_PAGE]──▶  content/index.ts
                                                │ (DOM capture + image/CSS inline)
popup.ts  ◀──[CAPTURE_DONE payload]──────────────
    │
    └──[sendMessage CAPTURE_DONE]──▶  background/index.ts
                                            │
                                    R2 설정 있음? ─YES─▶  uploadHtmlToR2() → PUT /bucket/{uuid}.html
                                            │                   │
                                            │              POST /api/archives  { storage_path, file_size }
                                            │
                                    R2 설정 없음? ─YES─▶  POST /api/archives  { html }
                                            │
popup.ts  ◀──[UPLOAD_DONE share_url]────────
```

## 컴포넌트별 역할

| 파일 | 역할 |
|------|------|
| `src/popup/popup.ts` | UI 제어, 메시지 오케스트레이션 (promise form `sendMessage` + try/catch) |
| `src/content/index.ts` | DOM cloneNode → 이미지 inline → CSS inline → script 제거 |
| `src/background/index.ts` | R2 업로드 시도 후 fallback → 서버 HTML 업로드 |
| `src/lib/r2-upload.ts` | `aws4fetch` 기반 SigV4 서명 + R2 PUT |
| `src/shared/messaging.ts` | 크로스 브라우저 메시징 shim (`onRequest`/`sendRequest`/`sendTabRequest`). Chromium은 `return true`+sendResponse, Safari/Firefox는 Promise 반환을 `browser` 전역 feature-detection으로 분기 |
| `src/shared/config.ts` | webpack `DefinePlugin` 빌드 상수에서 API/R2 설정 로드 (`chrome.storage` 미사용) |
| `src/shared/types.ts` | Message 유니언 타입 |

## 업로드 모드

### R2 직접 업로드 (권장 — 서버 불필요)

R2 크레덴셜은 **빌드 시 번들에 포함**됩니다. 팝업 입력 없이 동작합니다.

**설정 방법:**

1. `config.local.example.json`을 복사해 `config.local.json` 생성 (gitignored):
   ```bash
   cp config.local.example.json config.local.json
   ```

2. `config.local.json`에 실제 값 입력:
   ```json
   {
     "r2Endpoint": "https://<ACCOUNT_ID>.r2.cloudflarestorage.com",
     "r2Bucket": "page-share",
     "r2KeyId": "<R2 Access Key ID>",
     "r2Secret": "<R2 Secret Access Key>",
     "r2PublicUrl": "https://pub-<xxx>.r2.dev"
   }
   ```

3. 빌드 후 Chrome에 로드:
   ```bash
   npm run build
   ```

5개 값이 모두 있으면 R2 모드로 동작. `config.local.json`이 없거나 빈 값이 있으면 서버 HTML 업로드 fallback.

**Cloudflare Dashboard에서 값 찾는 곳:**
- ACCOUNT_ID: 우측 사이드바 "Account ID" 또는 R2 Overview URL
- Bucket 이름: R2 버킷 목록
- Key ID / Secret: R2 → "Manage R2 API Tokens" → "Create API Token"
- Public URL: R2 Bucket → Settings → Public Access → R2.dev subdomain URL

**보안 주의:**
- R2 Key ID / Secret은 빌드 시 `DefinePlugin`으로 **번들 JS에 baked**됩니다(`chrome.storage` 미사용). 본인 계정에서 발급한 값만 사용하고, R2 시크릿이 baked된 `dist/`·zip을 공개 배포하지 마세요. 공개 스토어 제출은 R2 필드를 비운 서버 모드 빌드로 합니다.
- R2에 업로드된 HTML은 Public URL로 누구나 접근 가능합니다(UUID로만 보호). 비공개 플래그는 목록 표시만 제어합니다.

### 서버 업로드 (R2 미설정 시 fallback)

팝업 상단 API URL + API Key 입력 후 저장. HTML 전체를 웹 앱 서버로 전송합니다.
서버에서 `sanitizeHtml()`로 XSS 정제 후 로컬 파일 저장.

## API 연동

- 기본 API URL: `http://localhost:52741` (`config.local.json`의 `apiBase`로 변경 후 재빌드)
- 설정 출처: `config.local.json` (gitignored) → webpack `DefinePlugin` 빌드 상수. 키: `apiBase`, `apiKey`, `r2Endpoint`, `r2Bucket`, `r2KeyId`, `r2Secret`, `r2PublicUrl`

**R2 모드 POST body** (`storage_path` 있음, `html` 없음):
```json
{ "title": "...", "original_url": "...", "storage_path": "https://pub-xxx.r2.dev/uuid.html", "file_size": 12345 }
```

**Legacy 모드 POST body** (`html` 있음, `storage_path` 없음):
```json
{ "title": "...", "original_url": "...", "html": "<!DOCTYPE html>..." }
```

응답 (공통): `{ "archive": {...}, "share_url": "https://pagekeep.pages.dev/archive/uuid" }`

## 운영 환경 연결

`config.local.json`의 `apiBase`를 운영 URL로 설정 후 `npm run build` 재실행:
- **apiBase**: `https://pagekeep.pages.dev`
- **API Key**: 서버의 `API_KEY` 환경변수 값과 동일하게 입력

R2 직접 업로드를 사용하면 서버가 다운돼도 R2 PUT 자체는 성공하지만, DB 기록(POST /api/archives)은 실패합니다. 이 경우 공유 URL을 얻을 수 없습니다.

## 빌드 및 설치

```bash
cd page-share-ext
npm install
npm run build   # dist/ 생성
```

Chromium 3종(Chrome/Edge/Opera)에 설치:
1. `chrome://extensions/` · `edge://extensions/` · `opera://extensions/` → 개발자 모드 활성화 (Opera는 먼저 켜야 로드 버튼 노출)
2. "압축 해제된 확장 프로그램 로드" → `dist/` 폴더 선택

스토어 제출 zip: `npm run package` → `packages/page-share-ext-v<version>.zip` (Chrome/Edge/Opera 공통, `*.map` 제외).
Safari: `npm run safari:init` → `safari/` Xcode 래퍼 스캐폴딩. 이후 절차는 `docs/SAFARI.md`.

## 크로스 브라우저 / Safari

- **Chrome/Edge/Opera**: `chrome.*`가 네이티브로 동작해 코드 변경 불필요. 실효 최소 버전 Chrome 90 / Edge 90 / Opera 76 (`await chrome.scripting.executeScript` promise form이 binding floor).
- **메시징 shim** (`src/shared/messaging.ts`): Chromium은 `onMessage`에서 `return true`+`sendResponse`가 필수이고 Safari/Firefox는 Promise 반환이 필요한데 둘이 상반됨. `browser` 전역 유무로 엔진을 감지해 각자의 네이티브 idiom을 선택한다. Chromium 경로는 기존과 동일. `webextension-polyfill`은 도입하지 않음(Chromium엔 불필요, Safari에선 passthrough라 문제를 못 풂).
- **`storage` 권한 제거**: 설정이 빌드 시 baked되어 `chrome.storage` 미사용 → 매니페스트에서 제거(스토어 심사 시 불필요 권한 지적 회피).
- **Safari R2/CORS (수동 작업)**: Safari는 Chromium과 달리 extension fetch에 CORS를 면제하지 않으므로 R2 버킷 CORS 정책이 필요하다(`AllowedOrigins:["*"]`, `Authorization` 헤더 명시). 막히면 서버 업로드 fallback으로 우회. 상세 JSON은 `docs/SAFARI.md`.
- **스토어 심사**: `<all_urls>` + `scripting`은 강화 심사 대상. Chrome/Edge는 개인정보 처리방침 필수. 정당화 근거와 선택적 단순화 제안은 `docs/CROSS_BROWSER.md`.

## 테스트

```bash
npm run test    # vitest run (jsdom 환경)
```

- `src/__tests__/sanitize.test.ts`: DOM 기반 script/이벤트핸들러 제거 검증
- `src/__tests__/r2-upload.test.ts`: `isR2Configured`, `uploadHtmlToR2` 단위 테스트 (9개)
  - `uploadHtmlToR2` 테스트는 `customFetch` 파라미터로 mock fetch를 주입해 실제 네트워크 요청 없이 검증

## 캡처 동작 (content/index.ts)

- `document.documentElement.cloneNode(true)` 후 `clone.outerHTML` 사용 → `<html lang="">`, `class="dark"` 등 속성 보존
- `<base href="[originalUrl]">` 를 `<head>` 맨 앞에 삽입해 인라인화 실패한 상대 URL의 fallback 처리
- CSS `<link>` 태그: 절대 URL로 변환 후 fetch → 인라인 `<style>`로 교체. 실패 시 href를 절대 URL로 업데이트 후 태그 유지
- fetch 성공한 CSS 내부의 상대 `url()` 경로도 절대 URL로 변환 (`fixCssUrls` 함수)
- 이미지: base64 데이터 URL로 인라인. CORS 실패 시 원본 src 유지

**R2 업로드 시 sanitize 없음**: HTML은 콘텐츠 스크립트의 `removeScripts()`로만 처리됩니다.
서버 업로드(legacy) 시에는 서버 `sanitizeHtml()`이 추가로 적용됩니다.

## Content Script 주입 방식

익스텐션 로드 전에 이미 열려있던 탭에는 `content_scripts` 선언으로는 content script가 자동 주입되지 않는다.
`popup.ts`에서 `chrome.scripting.executeScript`로 캡처 직전 명시적으로 주입한다.

```typescript
// popup.ts — sendMessage 직전에 실행
await chrome.scripting.executeScript({
  target: { tabId: tab.id },
  files: ["content/index.js"],
});
```

`content/index.ts` 최하단에서 `window.__pageShareInjected` 플래그로 이중 주입 시 리스너 중복 등록을 방지한다.

## 에러 로그 확인 위치

| 컴포넌트 | 방법 |
|---|---|
| content script | 저장할 페이지에서 F12 → Console |
| background service worker | `chrome://extensions/` → 익스텐션의 **"service worker"** 링크 클릭 |
| popup | 팝업 위에서 우클릭 → 검사(Inspect) |

## 주의 사항

- **content script**는 페이지 컨텍스트에서 실행되므로 `console.log`가 해당 페이지의 DevTools에 출력됩니다.
- **service worker** (`background/index.ts`)는 비활성 시 종료됩니다. 긴 업로드는 `chrome.tabs.onUpdated` 등으로 유지 필요.
- 외부 CSS가 CORS를 거부하면 fetch는 실패하지만 `<link href="절대URL">` 태그로 변환되어 보관됩니다. 오프라인 아카이브 목적이라면 MV3 background에서 fetch하는 구조로 개선 가능.
- R2 모드에서 반환하는 공유 URL은 `https://pub-xxx.r2.dev/archive/{uuid}.html` 형식의 R2 public URL입니다. 웹앱 서버가 없어도 접근 가능합니다.
- R2 object key는 `archive/{uuid}.html` 형식입니다 (`archive/` 접두어 포함).

## R2 액세스 키 발급 방법

1. Cloudflare Dashboard → R2 → "Manage R2 API Tokens"
2. "Create API Token" → 버킷에 Object Read & Write 권한 부여
3. Account ID, Access Key ID, Secret Access Key 복사 → 팝업 R2 설정에 입력
4. R2 버킷 → Settings → "Public access" → Custom domain 또는 R2.dev subdomain 활성화 → Public URL Base 입력

## 아이콘 준비

`icons/` 폴더에 `icon16.png`, `icon48.png`, `icon128.png`이 필요합니다.
현재 placeholder 없이 `noErrorOnMissing: true`로 설정돼 있어 빌드는 통과하지만,
크롬에서 로드 시 기본 아이콘이 표시됩니다. 실제 배포 전 추가하세요.
