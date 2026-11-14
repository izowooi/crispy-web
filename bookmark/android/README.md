# ZKeep Android

Chrome 등에서 **공유 → ZKeep** 하면 즉시 저장되고, 나중에 앱이나 웹(`https://keep.zowoo.uk`)에서 모아 보는 "나중에 보기" 북마크 앱입니다.
Kotlin + Jetpack Compose(Material 3), 단일 `app` 모듈, minSdk 26 / target 36.

## 빌드

JDK 17과 Android SDK(platform 36, build-tools 36.0.0)가 필요합니다. `local.properties`에 `sdk.dir=...`를 둡니다(gitignore 대상).

```bash
./gradlew :app:assembleDebug        # app/build/outputs/apk/debug/app-debug.apk
./gradlew :app:assembleRelease      # app/build/outputs/apk/release/app-release.apk (R8 + 리소스 축소)
./gradlew :app:testDebugUnitTest    # JVM 단위 테스트
./gradlew :app:lintDebug            # app/build/reports/lint-results-debug.html

# 디버그 빌드만 서버 주소 변경
./gradlew :app:assembleDebug -Pzkeep.baseUrl=http://192.168.0.10:8787
```

설치: `adb install -r app/build/outputs/apk/release/app-release.apk`

## 서명

- 릴리스 키: `keystore/zkeep-release.jks`, 비밀번호와 alias는 `keystore.properties`에 있습니다. **둘 다 gitignore 대상**이며 분실하면 같은 서명으로 업데이트할 수 없으니 별도로 백업하세요.
- `keystore.properties` 형식:

  ```properties
  storeFile=keystore/zkeep-release.jks
  storePassword=...
  keyAlias=zkeep
  keyPassword=...
  ```

- `keystore.properties`(또는 그 안의 키 파일)가 없으면 release 빌드는 실패하지 않고 **debug 키로 서명**됩니다.
- 인증서 확인: `$ANDROID_HOME/build-tools/36.0.0/apksigner verify --print-certs app/build/outputs/apk/release/app-release.apk`

## 로그인 흐름 (PKCE 브라우저 핸드오프)

앱은 Google 자격 증명을 보지 않습니다.

1. 앱이 `verifier`(32바이트 난수, base64url)를 만들어 저장하고 `challenge = base64url(SHA-256(verifier))`를 계산합니다.
2. Custom Tab으로 `{BASE}/auth/app/start?challenge=...&device=<기기 모델>`을 엽니다.
3. 웹이 Google 로그인 후 `zkeep://auth?code=...`(실패 시 `?error=...`)로 이동하면 `MainActivity`가 받습니다.
4. `POST /auth/app/token {code, verifier}` → 토큰과 사용자 정보를 앱 전용 저장소에 보관합니다(백업/기기 이전 제외).
5. 모든 API는 `Authorization: Bearer` 헤더를 씁니다. 401이 오면 로컬 로그아웃하지만 업로드 대기 큐는 유지합니다.

## 공유 흐름

- `ShareActivity`(반투명, 최근 앱에 안 남음)가 `ACTION_SEND text/plain`을 받으면 **확인 탭 없이** 즉시 대기 큐(`files/pending.json`)에 기록하고 "저장됨" 카드를 1.5초 보여 준 뒤 닫힙니다. 바깥을 탭하면 바로 닫힙니다.
- 공유 텍스트(`EXTRA_TEXT`)는 원문 그대로, 제목(`EXTRA_SUBJECT`)은 `title`로 보냅니다. URL 추출은 서버가 합니다.
- 업로드는 WorkManager(네트워크 연결 조건, 지수 백오프, API 31+에서 expedited)로 `POST /api/bookmarks`를 호출합니다. 클라이언트 UUID가 멱등 키라 재시도해도 중복되지 않습니다.
  - 2xx → 큐에서 제거, 401 → 보관 후 중단(로그인 후 재개), 429·5xx·네트워크 오류 → 재시도, 그 밖의 4xx → 버림.
- "실행취소": 아직 업로드 전이면 큐에서 지우고, 이미 올라갔으면 `DELETE /api/bookmarks/{id}`를 호출합니다.
- 로그인 전에 공유해도 큐에 보관되고, 로그인하면 자동 업로드됩니다.
- Direct Share(공유 시트 상단 바로가기)는 동적 공유 바로가기로 등록되며 Android 10(API 29)+에서 표시됩니다.

## 메인 화면

Keep 스타일 카드 그리드(태블릿 2~3열, 폰 1열), 당겨서 새로고침, 무한 스크롤, 전체/안읽음 필터, 검색. 첫 페이지는 디스크 캐시(`files/bookmarks_cache.json`)에서 즉시 그린 뒤 백그라운드로 갱신합니다. 카드 탭 → 브라우저로 열고 읽음 처리, 길게 누르기/더보기 → 읽음 전환·링크 복사·공유·삭제(스낵바 실행취소).
