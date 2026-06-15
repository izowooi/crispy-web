# Safari Web Extension 포팅 가이드

page-share-ext의 Chrome MV3 익스텐션을 Safari Web Extension으로 변환해 macOS Safari에서 개발용으로 실행하기 위한 가이드입니다. 모든 절차는 macOS 로컬/개인용 실행을 기준으로 하며, App Store 배포는 다루지 않습니다.

> 핵심 요약: `src/`는 4개 브라우저가 공유하고, Safari 래퍼(Xcode 프로젝트)만 `safari/`로 분리합니다. 컨버터는 **reference mode**로 `dist/`를 가리키므로 `npm run build` 한 번이 단일 소스입니다. 유료 Apple Developer 계정은 **불필요**합니다.

## 사전 조건

- **검증 환경**: 이 변환은 macOS 26.5 + Safari 26.5 + Xcode 26.5 + Node 22.19 환경에서 실제로 빌드 성공을 확인했습니다. `xcrun safari-web-extension-converter`로 생성한 macOS app 타깃과 extension 타깃이 `** BUILD SUCCEEDED **`까지 도달했습니다(ad-hoc signing).
- **최소 버전(historical baseline, 추정)**: macOS 컨버터는 WWDC 2020 출시 기준 Xcode 12 / Safari 14 / macOS 11 Big Sur가 하한입니다. 다만 Apple 현행 문서에 명시적 최소 버전이 없어 이 숫자는 보장된 하드 최소치가 아니라 출시 baseline으로 취급하세요(confidence: medium). 본 익스텐션의 **실효 최소 Safari는 16.4**입니다(이유는 아래 R2/CORS 절). 현재 환경(26.5)은 이를 크게 상회합니다.
- **컨버터 위치**: Xcode와 함께 제공되며 `xcrun --find safari-web-extension-converter`로 확인합니다.

  ```
  /Applications/Xcode.app/Contents/Developer/usr/bin/safari-web-extension-converter
  ```

  현행 Xcode에서 `--help`는 자신을 `safari-web-extension-packager`로 소개하며 "This tool used to be named safari-web-extension-converter"라고 알리지만, 기존 호출 이름은 그대로 동작합니다.

- **유료 Apple Developer Program 계정(연 $99) 불필요**: 로컬/개인용으로 **빌드·컴파일·실행**하는 데 유료 계정은 필요 없습니다. 무료 Apple ID(Personal Team) 또는 계정 없이 ad-hoc signing만으로 충분합니다(실제로 Team·인증서·Apple ID 없이 빌드 성공 — Xcode "Sign to Run Locally"가 바로 ad-hoc 서명). 유료 멤버십은 **실제 iOS 디바이스** 테스트나 App Store 배포에만 필요합니다. 단, 서명되지 않은 빌드를 Safari에 띄우려면 아래 "서명 없이 개발용으로 실행" 절차가 필요합니다.

## 변환 절차

### `npm run safari:init`

```bash
npm run safari:init
```

1. `npm run build` — webpack 빌드로 `dist/`를 생성합니다(`dist/manifest.json` 없으면 중단).
2. `node scripts/safari-init.mjs` — `dist/`를 입력으로 컨버터를 실행해 `safari/` 아래 Xcode 프로젝트를 만들고 bundle id를 정규화합니다.

내부 raw 명령(환경변수 `SAFARI_APP_NAME`, `SAFARI_BUNDLE_ID`로 override, 기본값 `Page Share` / `com.izowooi.pageshare`):

```bash
xcrun safari-web-extension-converter dist \
  --project-location safari \
  --app-name "Page Share" \
  --bundle-identifier com.izowooi.pageshare \
  --macos-only --no-open --no-prompt --force
```

`--copy-resources`는 **의도적으로 생략**합니다(아래 reference mode 참조).

### Reference mode — `src/`를 단일 소스로 유지

`--copy-resources`를 주면 컨버터가 입력 리소스를 Xcode 프로젝트 안으로 **복사**합니다. 그러면 `dist/` 빌드 결과와 사본이 이중화되어 코드 변경 시마다 다시 동기화해야 합니다.

`--copy-resources` 없이 실행하면 컨버터는 `dist/`를 **folder reference**로 가리킵니다(생성된 `project.pbxproj` 경로가 `../../../dist/manifest.json`처럼 상대 참조). 따라서 `dist/`가 복사되지 않고 참조되며 `src/`가 단일 source of truth로 유지됩니다. 코드 수정 → `npm run build`로 `dist/` 갱신 → Xcode에서 app 타깃 재빌드만 하면 반영됩니다(별도 복사/동기화 불필요).

### Bundle-id 정규화 quirk

컨버터는 app의 bundle id를 **app 이름에서 파생**합니다. `--app-name "Page Share"`이면 app id가 `com.izowooi.Page-Share`가 되는 반면 extension id는 `<BUNDLE_ID>.Extension`으로 만들어져, extension id가 app id로 **prefix되지 않아** embedding 빌드가 실패합니다(에러: "Embedded binary's bundle identifier is not prefixed with the parent app's bundle identifier"). 이는 서명이 아니라 prefix 불일치 문제입니다.

`safari-init.mjs`는 컨버터 직후 `project.pbxproj`의 모든 `PRODUCT_BUNDLE_IDENTIFIER`를 정규화해 해결합니다.

- app 타깃: `com.izowooi.pageshare`
- extension 타깃: `com.izowooi.pageshare.Extension`

수동 변환 시에도 `extension id = app id + ".Extension"` 관계를 맞춰야 합니다.

### 모노레포 배치

- 익스텐션 소스: `crispy-web/page-share-ext`
- 생성된 Safari 프로젝트: `crispy-web/page-share-ext/safari/Page Share/`
- Xcode 열기: `open "safari/Page Share/Page Share.xcodeproj"`
- Xcode 빌드 산출물(`build/`, `DerivedData/`, `*.xcuserstate`)은 `.gitignore`로 제외하고, 스캐폴딩 자체는 커밋합니다.

## Safari 호환성 점검

manifest는 MV3이며 `permissions: [activeTab, scripting]`, `host_permissions: ["<all_urls>"]`, `<all_urls>` content_script(`document_idle`), `background.service_worker`, `action.default_popup`을 선언합니다. (`chrome.storage`는 코드에서 사용하지 않아 `storage` 권한은 제거. config 값은 빌드 시 webpack DefinePlugin으로 baked.)

### `chrome.*` vs `browser.*` 네임스페이스 — ✅ 코드에서 처리 완료

- Safari는 WebExtension API를 주로 `browser.*`로 노출하지만 Chrome 호환을 위해 `chrome.*`도 alias로 제공합니다(Safari 15.4+). 따라서 `chrome.runtime` / `chrome.tabs` / `chrome.scripting` 호출은 Safari에서 그대로 바인딩됩니다. 차이는 네임스페이스 존재가 아니라 **메시징의 비동기 응답 방식**입니다.
- **메시징 결함과 본 저장소의 해결책**: `chrome.runtime.onMessage`에서 `return true` 후 비동기로 `sendResponse()`를 호출하는 Chrome 콜백 패턴은 Safari에서 **신뢰할 수 없습니다**(응답이 전달되지 않는 사례가 Apple Developer Forums에 다수 보고 — confidence: medium). 또한 `chrome.runtime.lastError`는 리스너 부재 시 Safari에서 set되지 않아 콜백이 영영 실행되지 않을 수 있습니다. 반대로 **리스너가 Promise를 반환**하면 그 resolution이 응답으로 전달되는 promise-first 모델은 Safari 15.4+에서 지원됩니다. 한편 **Chromium은 promise 반환을 지원하지 않아** `return true` + `sendResponse`가 필수입니다 — 두 엔진의 요구가 상반됩니다.
- 이 저장소는 `webextension-polyfill`을 도입하지 않고, 각 엔진의 네이티브 idiom을 feature-detection으로 선택하는 **dep-free 메시징 shim**(`src/shared/messaging.ts`)으로 해결했습니다. `browser` 전역의 존재로 Safari/Firefox를 구분하며(Chromium에는 없음 — polyfill이 쓰는 것과 동일한 신호), 리스너는 Chromium에서 `result.then(sendResponse); return true`(기존과 동일 경로)를, Safari/Firefox에서는 `return <Promise>`를 사용합니다. 송신 측은 promise form `sendMessage`를 await하며 `try/catch`로 오류를 표면화해 `lastError` 의존을 제거합니다. 자세한 판단은 `docs/CROSS_BROWSER.md`의 "webextension-polyfill 도입 판단" 참조.

### `background.service_worker` — ✅ Safari 15.4+

MDN BCD가 `background.service_worker`를 Safari `15.4`로 기록합니다. 이 manifest는 `background.scripts`/`background.page` 없이 `service_worker`만 선언하므로 Safari 15.4+가 service worker를 background로 직접 실행합니다. `preferred_environment`(Safari 18) 키는 두 background가 모두 있을 때만 의미가 있어 불필요합니다. 다른 MV3와 동일하게 비영속(event-driven, idle 시 종료, 이벤트로 wake)입니다.

### `chrome.storage` — local ✅ / sync ⚠️ (본 앱은 미사용)

`chrome.storage.local`은 Safari 14+ 완전 지원. `chrome.storage.sync`는 Safari 14+에서 API는 존재하나 **partial** — Safari는 sync 영역을 디바이스 간 동기화하지 않고 local처럼 동작합니다. 본 익스텐션은 `chrome.storage`를 사용하지 않으므로 실질 영향은 없습니다.

### `chrome.scripting` — ✅ Safari 15.4+

MDN BCD 기준 `scripting`/`scripting.executeScript` 모두 Safari `15.4`(과거 "Safari 17" 주장은 부정확). `src/popup/popup.ts`는 `await chrome.scripting.executeScript(...)`(promise form)을 사용하며 Safari 권장 스타일입니다. Safari 내부 페이지/일부 PDF 뷰어 등에서는 injection이 throw되며, 코드는 이를 catch해 메시징으로 진행합니다.

### `host_permissions: ["<all_urls>"]` / content_scripts — ⚠️ 사용자 사이트별 승인

manifest에 `<all_urls>`를 선언해도 Safari는 **자동 부여하지 않습니다**(Chromium과 결정적 차이). (a) 설치 프롬프트에 요청 host를 표시하지 않고, (b) host별 기본 상태가 "Ask"(미부여)이며, (c) 사용자가 Safari Settings ▸ Extensions에서 사이트별 허용 또는 "Always Allow on Every Website"로 일괄 허용해야 합니다. 부여 전에는 해당 도메인에서 content_scripts 주입과 `executeScript`가 아무것도 하지 않습니다(설계상 privacy).

**실무 우회**: `activeTab` 권한(Safari 14+)은 사용자 제스처(toolbar 클릭) 시 **활성 탭**에 임시 접근을 부여하므로, popup에서 트리거하는 `executeScript`는 사용자가 `<all_urls>`를 넓게 켜기 전에도 현재 탭에서 동작합니다. 이 앱은 클릭 기반 "현재 페이지 저장" 플로우이므로 activeTab 경로가 핵심 동작을 받쳐줍니다.

## R2 직접 업로드 / CORS

background service worker에서 aws4fetch로 R2에 직접 PUT합니다: `https://<acct>.r2.cloudflarestorage.com/<bucket>/archive/<uuid>.html`, SigV4 `Authorization` + `x-amz-*` 헤더 + `Content-Type: text/html`.

### `crypto.subtle` 가용성 — ✅

Web Crypto / `crypto.subtle`은 WebKit에서 Safari 11(2017)부터 표준 준수로 구현되었고 service worker에서도 동일 semantics(HMAC-SHA256, `importKey`, `sign`, `digest`, secure context)로 노출됩니다. aws4fetch의 SigV4 HMAC은 Safari extension SW에서 동작합니다.

### CORS가 PUT를 막는가 — ⚠️ R2 버킷 CORS 설정 필요 (수동 작업)

이는 Chromium과 **반대**입니다. Chrome은 host_permissions가 있으면 extension SW의 cross-origin 요청에 CORS를 면제(preflight 미발생)하지만, **Safari는 그 면제를 주지 않습니다**. Safari extension background의 cross-origin 요청은 표준 CORS를 거치며, 서버가 일치하는 `Access-Control-Allow-Origin`을 반환하지 않으면 `Origin safari-web-extension://<id> is not allowed by Access-Control-Allow-Origin`으로 실패합니다(Apple 포럼 654839·708171·727090, confidence: medium). R2로의 PUT는 non-safelisted 헤더 + `text/html` 본문 때문에 **preflight OPTIONS**를 유발하므로 R2 버킷의 CORS 정책으로 응답해야 합니다.

> 실측: 이 저장소가 사용하는 R2 버킷에 OPTIONS preflight를 보낸 결과 **현재 CORS 정책이 없습니다**(403, `Access-Control-Allow-*` 헤더 없음). Chromium에서 지금 동작하는 이유는 host_permissions가 CORS를 우회하기 때문이며, Safari에서는 아래 정책을 적용하기 전까지 PUT가 막힐 가능성이 높습니다.

- **버전 주의**: background service worker fetch 자체가 Safari 16.4부터 동작합니다. WebKit "Safari 16.4" release note에 "Fixed CORS issue when doing fetch requests from a background service worker"가 명시되어 있어 **Safari 16.4+를 타깃**으로 합니다.
- **Origin이 불안정**: background가 보내는 Origin은 `null`이 아니라 `safari-web-extension://<uuid>`이며, 이 UUID는 fingerprinting 방지를 위해 재생성됩니다. 따라서 origin을 하드코딩할 수 없어 `AllowedOrigins: ["*"]`가 강제됩니다.

### R2 버킷 CORS JSON (Cloudflare Dashboard ▸ R2 ▸ 버킷 ▸ Settings ▸ CORS Policy)

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type", "authorization", "x-amz-content-sha256", "x-amz-date"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

주의:
- **`Authorization` 헤더는 wildcard `*`로 커버되지 않습니다**(MDN: "The Authorization header doesn't accept wildcard and always needs to be listed explicitly"). 반드시 `authorization`을 직접 나열하세요. `AllowedHeaders: ["*"]`만으로는 preflight가 실패합니다.
- `AllowedOrigins: ["*"]`는 SigV4가 인증을 `Authorization` 헤더에 두는 non-credentialed 요청이라 유효합니다. 쿠키(`credentials: 'include'`)는 사용하지 마세요.
- **대안 / 안전망**: CORS 설정이 번거롭거나 막히면, 익스텐션의 기존 **서버 업로드 fallback**을 사용할 수 있습니다(R2 config를 비우면 HTML을 page-share 웹앱 서버로 POST → 서버가 R2에 업로드, 브라우저 CORS 미발생). Safari에서 직접 PUT가 막혀도 사용자가 막히지 않습니다.

## 서명 없이 개발용으로 실행

유료 계정 없이 빌드한 익스텐션을 Safari는 **unsigned**로 취급해 기본적으로 무시합니다. 개발용으로 띄우려면 "Allow unsigned extensions"를 켜야 합니다.

### 단계 (Safari 17+ / 현재 환경 Safari 26.5)

1. Xcode에서 `safari/Page Share/Page Share.xcodeproj`를 열고 **컨테이너 app 타깃을 Product ▸ Run**으로 한 번 실행합니다(이후 변경은 Product ▸ Build로 반영).
2. Safari ▸ Settings ▸ **Advanced** 탭에서 "Show features for web developers"를 켜 Develop/Developer 메뉴를 활성화합니다.
3. Safari ▸ Settings ▸ **Developer** 탭에서 **"Allow unsigned extensions"** 를 켭니다(로그인 암호 입력). 구버전 Safari에서는 메뉴 막대 Develop ▸ "Allow Unsigned Extensions" 위치였습니다.
4. Safari ▸ Settings ▸ **Extensions**에서 Page Share를 활성화합니다.
5. `<all_urls>` 동작이 필요하면 website access에서 사이트별 허용 또는 "Always Allow on Every Website"를 부여합니다. 클릭 기반 저장 플로우는 activeTab으로도 동작합니다.

### 한계

- **세션마다 리셋**: "Allow unsigned extensions"는 **Safari 종료 시마다 초기화**되어 다음 실행 시 다시 켜야 합니다(매번 로그인 암호 재입력). 이것이 유료 서명 없이 개인용으로 실행하는 실질 비용입니다.
- **영구 설치**: 재토글 없이 영구 설치하려면 서명된 빌드(무료 Personal Team development certificate 또는 App Store 배포)가 필요합니다.
- **플랫폼**: 무료 경로는 Mac에서만 가능합니다. iOS/iPadOS는 App Store를 거치지 않고 Safari Web Extension을 로드할 방법이 없습니다.
