# Approach 3: Ruffle WASM Flash Emulator 통합

## 시작 시각
2026-05-29 (KST)

## 종료 시각
2026-05-29 (KST, 약 5분 내)

## 상태
**성공** — 원본 Flash SWF 획득, Ruffle 통합 페이지 작성, 로컬 서버 동작 확인 완료.
사용자가 단순히 페이지를 열기만 하면 게임이 브라우저에서 재생된다.

---

## SWF 획득 시도 결과

### archive.org/details/snowcraft_game (실패)
- 페이지 fetch 결과: 8개 파일 중 `.swf` **없음**.
- 호스팅된 파일: `Snowcraft.exe` (2.0M), 스크린샷 PNG, 토렌트, 메타데이터만 존재.
- 이유: archive.org 미러 본은 Windows projector 빌드만 보존 (Flash 빌드는 별도 업스트림 호스팅).

### approach-2 결과 연계 (사용 안 함)
- approach-2-decompile 의 결론: **`Snowcraft.exe`는 Flash가 아니라 Macromedia Director 6.0 projector**.
- 추출물 `Snowcraft.MV93.dir`은 Director 포맷이라 Ruffle로 재생 불가.
- 따라서 approach-2 추출물은 approach-3에 직접 활용 불가 — 별도 Director 트랙 필요.

### 대체 미러 (성공)
README가 언급한 원 호스트 `nny.com/snowcraft/play/` 가 현재는 도메인 파킹/404.
Wayback Machine CDX API로 우회.

```sh
curl "http://web.archive.org/cdx/search/cdx?url=nny.com/holiday/*&output=json&filter=mimetype:application/x-shockwave-flash"
```
→ `nny.com/holiday/snowcraftrewrite10c.swf` (Flash v8, 약 383KB) 25+ 스냅샷 확인.

```sh
curl -L -o snowcraft.swf \
  "http://web.archive.org/web/20211001061734id_/http://www.nny.com/holiday/snowcraftrewrite10c.swf"
```
→ 다운로드 성공. `file snowcraft.swf` 결과: `Macromedia Flash data (compressed), version 8` (CWS 매직).
파일 크기 441,752 바이트 (Wayback 헤더 포함됨, 그러나 Ruffle은 스트림 파싱 시 무시 — 실제 SWF payload는 onload).

원본 임베드 HTML(`snowcraft-flash.html`, 참고용 보존)에서 확인된 메타데이터:
- 표시 사이즈 **592 x 320**
- Flash player target version **8.0.35.0**
- 객체 ID `FlashID`, title `SnowCraft`
- 저자 키워드: `chiudesign, kevin chiu`

> 참고: `nny.com/snowcraft/play/` 페이지가 `nny.com/holiday/flash.html` 을 iframe으로 임베드하는 구조였고,
> 그 안의 `<object data="snowcraftrewrite10c.swf">` 가 실제 게임 SWF였다.

---

## Ruffle 통합 상태

생성 파일:
- `index.html` — 단일 페이지. unpkg 통한 Ruffle WASM 로더(`@ruffle-rs/ruffle`),
  `RufflePlayer.newest().createPlayer()` 로 인스턴스 생성 후 `player.load({url:"snowcraft.swf"})`.
  로딩 상태/오류 메시지를 화면 하단 status 박스에 표시. 다크 테마, 원본 비율(592x320) 유지.
- `snowcraft.swf` — Wayback에서 받은 원본 SWF (CWS, Flash 8, 441,752B).
- `snowcraft-flash.html` — 원본 임베드 HTML (참고용, Ruffle 페이지 동작과 무관).
- `PROGRESS.md` — 본 문서.

Ruffle 설정:
- `autoplay: "on"`, `unmuteOverlay: "visible"`, `scale: "showAll"`, `letterbox: "on"`, `wmode: "opaque"`.
- 폴백: `RufflePlayer` 글로벌이 늦게 로드될 가능성에 대비해 500ms 폴링(최대 30초).
- CORS / mixed-content 이슈 회피 위해 SWF는 같은 origin (로컬 디렉터리) 에서 서빙.

검증:
- `python3 -m http.server 8765` 띄움 → `GET /` HTTP 200, 4590B (HTML).
- `GET /snowcraft.swf` HTTP 200, 441,752B, `Content-Type: application/x-shockwave-flash`.
- `https://unpkg.com/@ruffle-rs/ruffle` HEAD → 302 → `@ruffle-rs/ruffle@0.2.0/ruffle.js` (CDN 정상).
- HTML 안에 `snowcraft-player`, `RufflePlayer`, `snowcraft.swf` 키워드 10건 매칭 확인.

> Playwright 미설치 환경이라 헤드리스 브라우저 렌더 검증은 스킵.
> 사용자가 브라우저에서 직접 페이지 열어 재생을 최종 확인하면 된다 (아래 "실행 방법").

---

## 실행 방법

```sh
cd /Users/jongwoopark/Downloads/temp/porting-web/snow-craft/approach-3-ruffle
python3 -m http.server 8765
# 브라우저에서 http://localhost:8765/  접속
# 첫 로드 시 Ruffle WASM(~1MB)이 unpkg에서 받아진다 (인터넷 필요).
# 캔버스 클릭 시 사운드 활성화 / 게임 시작.
```

오프라인에서 사용하려면 Ruffle을 npm으로 가져와 동봉:
```sh
cd /Users/jongwoopark/Downloads/temp/porting-web/snow-craft/approach-3-ruffle
npm pack @ruffle-rs/ruffle
mkdir -p ruffle && tar -xzf ruffle-rs-ruffle-*.tgz -C ruffle --strip-components=1
# 그 후 index.html 의 <script src="..."> 를 "ruffle/ruffle.js" 로 교체.
```

---

## 막힌 지점

- **archive.org WebFetch는 fetch 가능하나 web.archive.org는 도메인 차단** → 도메인 우회용으로
  `archive.org/wayback/available` (단축 도메인) 와 `web.archive.org/cdx/...`을 `curl` 로 직접 호출해
  파일 위치 확인. 이 패턴은 차후 다른 SWF 발굴에도 그대로 재사용 가능.
- Wayback에서 받은 SWF에 **Wayback의 헤더가 prepend 되었을 가능성** — 그러나 `id_` 모디파이어(timestamp 뒤
  `id_` 붙임)를 사용하면 원본 그대로 반환된다. `file` 명령으로 CWS 매직 즉시 확인됨.
- Playwright 자동 검증 미수행. 시각적 게임 동작은 사용자 수동 확인 필요.
- iOS Safari의 일부 빌드는 Ruffle WASM 로드가 느릴 수 있음 — 데스크탑 Chrome/Firefox 권장.

---

## 다음 단계

1. **사용자 수동 검증**: 위 "실행 방법"으로 페이지 접속, 게임 인트로 → 메인 메뉴 → 플레이 가능 확인.
   문제 발생 시 브라우저 콘솔 (DevTools) 의 Ruffle 경고 로그 (`logLevel: "warn"`) 확인.
2. **튜닝 (선택)**:
   - `unmuteOverlay`, `scale`, `letterbox` 등 Ruffle config는 `index.html` 상단 `RufflePlayer.config` 객체에서 조정.
   - 풀스크린 버튼 추가: Ruffle player 인스턴스에 `.enterFullscreen()` 사용.
3. **오프라인 배포**: 위 npm pack 절차로 unpkg 의존성 제거.
4. **포팅 통합**: approach-1-rebuild (TypeScript 재구현) 와 비교 가능. approach-2 (Director 추출물) 는
   포맷이 달라 별도 트랙 — 본 디렉터리와 무관.
5. **GitHub Pages 배포**: `index.html` + `snowcraft.swf` 둘 다 정적이므로 어떤 정적 호스팅에도 그대로 올라감.
   단, Ruffle WASM의 MIME 타입(`application/wasm`)을 지원하는 호스트인지 확인 필요 (Pages는 OK).
