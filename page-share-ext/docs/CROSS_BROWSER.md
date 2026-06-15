# 크로스 브라우저 가이드 (Chrome / Edge / Opera / Safari)

이 익스텐션은 하나의 `src/`로 Chrome·Edge·Opera(Chromium 3종)와 Safari를 모두 지원합니다. Chromium 3종은 동일한 `dist/`(unpacked) 또는 동일한 zip으로 동작하고, Safari는 `safari/`의 Xcode 래퍼로 빌드합니다(→ `docs/SAFARI.md`).

## chrome.* API 호환성

### 호환성 표

| API | Chrome | Edge | Opera | Safari |
|-----|--------|------|-------|--------|
| `chrome.runtime.onMessage` (async 응답) | ✅ 88 | ✅ 88 | ✅ 74 | ✅ 15.4 (shim) ¹ |
| `chrome.runtime.sendMessage` | ✅ 88 | ✅ 88 | ✅ 74 | ✅ 15.4 (shim) ¹ |
| `chrome.runtime.lastError` | ✅ 88 | ✅ 88 | ✅ 74 | ⚠️ 미사용으로 대체 ² |
| `chrome.tabs.query` | ✅ 88 | ✅ 88 | ✅ 74 | ✅ 15.4 |
| `chrome.tabs.sendMessage` | ✅ 88 | ✅ 88 | ✅ 74 | ✅ 15.4 (shim) ¹ |
| `chrome.scripting.executeScript` (promise) | ✅ 90 | ✅ 90 | ✅ 76 | ✅ 15.4 |
| MV3 manifest (`service_worker`, `host_permissions`, `action`) | ✅ 88 | ✅ 88 | ✅ 74 | ✅ 15.4 |

- Edge 버전 번호는 Chromium과 일치(Edge 88 = Chromium 88). Opera는 별도 체계(Opera 74 = Chromium 88, Opera 76 = Chromium 90).
- **이 익스텐션의 실효 최소 버전 = Chrome 90 / Edge 90 / Opera 76**입니다. 가장 높은 floor는 `await chrome.scripting.executeScript`(promise form, Chrome 90)에서 옵니다. (callback 전용 API들은 88이지만 promise executeScript가 binding floor.)
- Safari 실효 최소는 **16.4**입니다(background service worker fetch + CORS 수정 — `docs/SAFARI.md` 참조).

각주:
- ¹ Safari는 `chrome.*`를 `browser.*` alias로 제공하지만, `onMessage`에서 `return true` 후 비동기 `sendResponse()`를 호출하는 Chrome 콜백 패턴은 Safari에서 신뢰할 수 없습니다(Apple Developer Forums 다수 보고, confidence: medium). 본 저장소는 `src/shared/messaging.ts`의 dep-free 메시징 shim으로 각 엔진의 네이티브 idiom을 선택해 이를 해결했습니다(아래 참조). 따라서 4개 브라우저 모두 ✅.
- ² `chrome.runtime.lastError`는 Safari에서 리스너 부재 시 set되지 않는 결함이 있어, 송신 측을 promise form `sendMessage` + `try/catch`로 바꿔 lastError 의존을 제거했습니다.

### 코드 변경 요약

- **Chrome / Edge / Opera**: 코드 변경 **불필요**. `chrome.*` API가 네이티브로 동작합니다. (Task A에서 추가로 손댄 것은 미사용 `storage` 권한 제거 + `npm run package` 스크립트뿐이며, 런타임 동작은 동일합니다.)
- **Safari**: 메시징 응답 방식이 Chromium과 상반되어 dep-free 메시징 shim을 도입했습니다(`src/shared/messaging.ts`). Chromium 경로는 기존과 byte 단위로 동일하게 유지됩니다.

### webextension-polyfill 도입 판단 — 도입하지 않음

**결론: `webextension-polyfill`을 도입하지 않습니다.**

판단 근거:

1. **Chromium 3종에는 불필요**: Chrome/Edge/Opera는 모두 `chrome.*`를 네이티브로 제공합니다(Edge·Opera도 동일 namespace). 본 코드가 쓰는 모든 API가 네이티브이므로 polyfill은 순수 오버헤드(~3KB gzip, 10KB minified)입니다.
2. **Safari에서도 polyfill이 문제를 풀지 못함**: polyfill은 Chrome에서 `browser.*`(promise) wrapper를 제공하지만, Safari에서는 `browser.*`가 이미 네이티브라 polyfill이 **passthrough**입니다. 즉 정작 문제가 되는 Safari의 메시징 결함을 polyfill이 고쳐주지 않습니다. (참고: polyfill의 `onMessage` wrapper는 `return true`+`sendResponse`와 Promise 반환을 **둘 다** 지원하지만, 그건 Chrome 쪽 얘기입니다.)
3. **실제 필요한 것은 메시징 응답 idiom의 엔진별 분기**: Chromium은 `return true`+`sendResponse`, Safari/Firefox는 Promise 반환이 필요합니다(상반). 이를 위해 `browser` 전역 유무로 엔진을 구분하는 ~10줄 shim(`src/shared/messaging.ts`)을 두는 편이, 의존성을 추가하는 것보다 작고 명확합니다. (`browser` 전역 유무는 polyfill 자신이 쓰는 감지 신호와 동일합니다.)

요약하면, polyfill은 "Chromium 전용 코드"에 불필요하고, "Safari 문제"는 풀지 못합니다. 그래서 도입 대신 최소 shim으로 해결했습니다.

## 개발자 모드로 dist/ 로드

빌드 산출물 `dist/`(루트에 `manifest.json`)를 unpacked extension으로 직접 로드합니다. 먼저 빌드:

```bash
npm install
npm run build   # → dist/
```

### Chrome (Chrome 90+)

1. 주소창에 `chrome://extensions` 입력
2. 우측 상단 **개발자 모드**(Developer mode) 켜기
3. **압축해제된 확장 프로그램 로드**(Load unpacked) 클릭
4. `dist/` 폴더 선택

### Edge (Edge 90+)

1. 주소창에 `edge://extensions` 입력
2. 좌측 하단 **개발자 모드**(Developer mode) 켜기
3. **압축을 푼 확장 로드**(Load unpacked) 클릭
4. `dist/` 폴더 선택

### Opera (Opera 76+)

1. 주소창에 `opera://extensions` 입력 (`chrome://extensions`도 동작)
2. **개발자 모드**(Developer Mode)를 **먼저** 켜기 — 이 토글을 켜야 다음 버튼이 나타남
3. **압축해제된 확장 로드**(Load unpacked extension) 클릭
4. `dist/` 폴더 선택

> Gotcha: Opera는 Developer Mode가 꺼져 있으면 "Load unpacked extension" 버튼 자체가 보이지 않습니다. 폴더 선택 전 반드시 Developer Mode를 먼저 켜세요.

### Safari

Safari는 unpacked 로드가 아니라 Xcode 래퍼로 빌드합니다 → `docs/SAFARI.md`.

## 스토어 제출 패키징 — `npm run package`

```bash
npm run package   # = npm run build + node scripts/package.mjs
```

- 산출물: `packages/page-share-ext-v<version>.zip` (`manifest.json`이 zip 루트).
- 시스템 `zip` 사용(추가 의존성 없음). **`*.map` 제외** — webpack `devtool: "source-map"` + DefinePlugin이 R2 시크릿을 번들에 baked하므로 source map에 시크릿 문자열이 노출될 수 있습니다.
- `config.local.json`에 실제 R2 시크릿이 있으면 스크립트가 **경고**합니다(번들에 시크릿이 포함되므로 공개 스토어에 올리면 안 됨).

### Chrome Web Store / Edge Add-ons / Opera Addons — 매니페스트 차이

**필수 매니페스트 차이는 없습니다.** 셋 다 Chromium 기반이라 **동일한 `manifest.json`(같은 zip)** 을 세 스토어에 그대로 제출합니다.

- `browser_specific_settings`(Firefox/Safari용), `update_url`(자체 호스팅용), `key`(로컬 ID 고정용)는 이 3개 스토어에 **불필요**합니다. Chromium은 모르는 키를 무시하지만, 혼동을 줄이려 넣지 않는 것을 권장합니다.
- 익스텐션 ID는 각 스토어가 업로드 시 부여하므로 직접 작성하지 않습니다.

### ⚠️ R2 시크릿 빌드는 공개 스토어에 올리지 말 것

R2 직접 업로드 모드는 `config.local.json`의 R2 시크릿을 DefinePlugin으로 **번들 JS에 baked**합니다. 이 빌드를 공개 스토어에 올리면 시크릿이 노출됩니다. 공개 제출이 필요하면 `config.local.json`의 `r2*` 필드를 비우고 다시 빌드해 **서버 업로드 fallback 모드**로 제출하세요(시크릿 미포함). 개인용 unpacked/Safari 로컬 설치에는 R2 baked 빌드를 그대로 써도 됩니다.

## 스토어 심사 권한 주의사항

현재 매니페스트는 `host_permissions: ["<all_urls>"]` + `<all_urls>` content_script(`document_idle`) + `scripting` + `activeTab`을 선언합니다. 광범위 권한 조합이라 세 스토어 모두에서 **강화된 수동 심사**를 받을 가능성이 높습니다.

### 권한별 정당화 (심사 대응)

- **`host_permissions: ["<all_urls>"]`** (가장 무거운 항목): 전체 페이지 아카이브를 위해 임의 CDN origin에서 cross-origin CSS/이미지를 fetch해 inline 처리해야 합니다. 대상 origin을 사전 열거할 수 없어 호스트 목록으로 좁힐 수 없습니다.
- **`<all_urls>` content_script (`document_idle`)**: 완전히 렌더링된 DOM/CSS를 읽으려면 `document_idle` 타이밍 실행이 필요합니다.
- **`scripting`**: 번들에 포함된 **정적 함수만** 주입하며 동적 조립/원격 코드는 주입하지 않습니다. Chrome 대시보드에 "no remote code"로 선언하세요. (MV3 remotely-hosted code 금지 — cross-origin CSS/이미지를 **데이터로** 가져와 inline하는 것은 data retrieval이라 위반 아님.)
- **`activeTab`**: 사용자 제스처 시 현재 탭 임시 접근. `<all_urls>`보다 경고가 약합니다.
- **제거됨 — `storage`**: 코드에서 `chrome.storage`를 전혀 사용하지 않아(설정은 빌드 시 DefinePlugin으로 baked) 매니페스트에서 제거했습니다. 불필요 권한은 모든 스토어의 명시적 거절 사유입니다.

### 개인정보 처리방침 (Chrome/Edge 필수)

- **Chrome Web Store**: 페이지의 DOM/CSS/이미지와 방문 URL을 다루므로 "personal or sensitive user data"(Website content and resources, Web browsing activity)에 해당 → **개인정보 처리방침 URL이 필수**입니다(로컬 저장만 해도 필요). Limited Use 공시도 함께 필요합니다. 누락이 가장 흔한 거절 사유입니다.
- **Edge Add-ons**: 정책 1.5에 따라 개인정보 처리방침이 필수이며, Microsoft Edge를 명시하고 설치 시점에 데이터 처리 방식을 공시해야 합니다.
- **Opera Addons**: 별도 개인정보 처리방침 URL을 하드 요구하는지는 문서상 불명확하나(사적 정보의 무단 수집·외부 전송 금지는 명시), Chrome/Edge용으로 이미 만들 것이므로 함께 두는 것을 권장합니다.

### 선택적 단순화 제안 (미적용)

`popup.ts`가 캡처 직전 항상 `chrome.scripting.executeScript`로 content script를 주입하므로, `manifest.json`의 `<all_urls>` `content_scripts` 자동 주입은 **중복일 수 있습니다**. `content_scripts` 선언을 제거하고 `activeTab` + `scripting` 온디맨드 주입만 쓰면 "모든 페이지에서 상시 실행"이 사라져 심사 부담과 사용자 경고가 줄어듭니다. 다만 이는 동작 변경(특히 Safari의 사이트별 grant·이미지/CSS fetch의 graceful degradation 확인 필요)이므로 **제안만 하고 본 작업에서는 적용하지 않았습니다.**
