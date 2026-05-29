# Snowcraft Web Porting — 작업 통합 보고서

작업 시작/종료: 2026-05-29
원본 위치: `/Users/jongwoopark/Downloads/temp/porting-web/Snowcraft/`
결과 위치: `/Users/jongwoopark/Downloads/temp/porting-web/snow-craft/`

## 핵심 결론

원본 `Snowcraft/` 폴더에는 **포팅 가능한 실제 소스 코드가 없습니다**. 작성자가 직접 `MAIN.as`에 *"I do not know how to program in ActionScript, so this is just a sample pseudocode script"*라고 명시했고, `PROJECT_LANG_1.as`(13줄)도 메타 설명에 불과합니다. 실질 자료는:

- `EXE/Snowcraft.exe` — 2.0 MB Windows PE32 바이너리 (컴파일됨)
- `Images/snowcraft*.png` — 게임 스크린샷 5장
- `README.md` — 게임 메커니즘 정성적 설명

따라서 사용자 요청대로 **3가지 접근을 병렬로 시도**했고, **3가지 모두 의미 있는 결과물을 산출**했습니다. 각 결과물은 독립적으로 실행 가능하며, 세션 중단 시 재개를 위한 `PROGRESS.md`가 모든 폴더에 있습니다.

## 중요한 발견 (가설 정정)

원본 README는 "Flash 게임의 Windows 포트"라고 적었으나 **이 가설은 절반만 맞았습니다**:

- **`Snowcraft.exe`** = 1998년 wells packard의 **Macromedia Director 6.0 Projector** (Flash 아님). SWF 시그니처 0건, "Director 6.0" 문자열 다수 검출.
- **archive.org/nny.com 호스팅 SWF** = kevin chiu의 **Flash 8 리메이크 버전** (별도 자산). 파일명 `snowcraftrewrite10c.swf`가 "rewrite"임을 시사.

즉 .exe와 SWF는 **같은 게임의 별개 빌드**이며, Director Lingo와 Flash ActionScript로 각각 작성된 별개 코드베이스입니다.

## 3가지 접근 결과 요약

| | Approach 1 — Rebuild | Approach 2 — Decompile EXE | Approach 3 — Ruffle SWF |
|---|---|---|---|
| 폴더 | `approach-1-rebuild/` | `approach-2-decompile/` | `approach-3-ruffle/` |
| 상태 | **완료** | **부분 성공** | **성공** |
| 결과물 | Vite+TS+Canvas 신규 게임 | 추출된 Director 무비 `.dir` | Ruffle 통합 정적 페이지 + 원본 SWF |
| 테스트 | Vitest 44 PASS, Playwright 6 PASS, build PASS | strings 분석 완료, Lingo 디컴파일 미완 | 로컬 서빙 및 CDN 응답 확인 |
| 다음 세션 작업 | 없음 (모든 요구사항 충족) | ProjectorRays로 Lingo 소스 복원 | 브라우저에서 최종 시각 확인 |

### Approach 1 — TypeScript+Canvas 신규 구현 (완료, TDD+Playwright)

사용자의 요구사항(TDD, Playwright E2E, Vite, Web Audio, 통합 테스트)을 모두 충족. 스크린샷 5장과 README의 메커니즘 설명을 바탕으로 신규 구현.

- **빌드**: Vite + TypeScript, 프로덕션 번들 15.46 kB (gzip 5.50 kB)
- **단위 테스트** (Vitest): **44 / 44 PASS** — Vector2(9), levelConfig(6), Player(9), Snowball(5), Game(11), Input(4)
- **E2E 테스트** (Playwright): **6 / 6 PASS** — 페이지 로드/Start/던지기/마우스 차지/레벨업/게임오버
- **렌더링**: Canvas 2D (캐릭터 도트, 그림자, HP 바, 차지 게이지, 조준 점선)
- **오디오**: Web Audio API 합성 (throw 휘슬, hit 임팩트, level-clear 멜로디)
- **입력**: 마우스 클릭+홀드 차지 / WASD 이동 / Tab 캐릭터 전환 / Space 다음 레벨

실행:
```bash
cd /Users/jongwoopark/Downloads/temp/porting-web/snow-craft/approach-1-rebuild
npm install
npx playwright install chromium
npm run dev          # http://localhost:5173
npm test             # Vitest
npm run test:e2e     # Playwright
npm run build
```

상세: `approach-1-rebuild/PROGRESS.md`

### Approach 2 — `Snowcraft.exe` 분해 (부분 성공)

`.exe`가 Flash가 아닌 **Macromedia Director 6.0 Projector**임을 확정. 임베디드 무비 파일을 추출했지만 Lingo 바이트코드 → 텍스트 디컴파일은 환경에 도구가 없어 미완.

- **추출 성공**: `extracted/Snowcraft.MV93.dir` (573 KB, RIFX/MV93 컨테이너)
- **strings로 노출된 게임 자료**:
  - 저자: wells packard - Nicholson, NY (wells@nny.com)
  - 원본 빌드 경로: `C:\WINNT\Profiles\wells\Desktop\snowcraft98\sc98_13.dir`
  - 레벨 데이터: `[#gd:3,#level:1]`, `[#gd:5,#level:2]`, `[#gd:7,#level:3]`, `[#gd:9,#level:4]`, `[#gd:12,#level:5]`
  - 캐스트: snowball, "Snowball red", "Snowballs Green", "R Auto walk_1/2", snowcraft_palatte, snowcraft_256
  - 사운드: short_chirps, bird_tweets, "Whoosh Percusive"
  - 스크립트명: "GREEN DUDES SCRIPT", "RED DUDES SCRIPT"
- **막힌 지점**: macOS에 ProjectorRays / Wine / Ghidra 미설치
- **다음 세션에서 이어가기**:
  ```bash
  brew install cmake boost zlib mpg123
  git clone --recursive https://github.com/ProjectorRays/ProjectorRays.git
  cd ProjectorRays && cmake -B build && cmake --build build
  ./build/projectorrays decompile \
    /Users/jongwoopark/Downloads/temp/porting-web/snow-craft/approach-2-decompile/extracted/Snowcraft.MV93.dir
  ```

상세: `approach-2-decompile/PROGRESS.md`

### Approach 3 — 원본 Flash SWF + Ruffle (성공)

archive.org에는 SWF가 없고 .exe만 있었으나, Wayback Machine CDX API로 `nny.com/holiday/snowcraftrewrite10c.swf` (Flash v8, 442 KB) 발견·다운로드. Ruffle WASM 에뮬레이터로 재생되는 단일 페이지 통합.

- **자산**: `snowcraft.swf` — Macromedia Flash data (compressed), version 8
- **통합 페이지**: `index.html` — Ruffle CDN(unpkg) 로드 + `RufflePlayer.newest().createPlayer()` + `player.load({url:"snowcraft.swf"})`
- **검증**: 로컬 HTTP 서버에서 HTML/SWF 정상 서빙, Ruffle CDN 정상 응답 확인 (브라우저 시각 검증은 사용자 단말에서)

실행:
```bash
cd /Users/jongwoopark/Downloads/temp/porting-web/snow-craft/approach-3-ruffle
python3 -m http.server 8765
# 브라우저에서 http://localhost:8765/ 열기
```

상세: `approach-3-ruffle/PROGRESS.md`

## 사용자 원 요청 항목별 충족 여부

| 요구사항 | 어디서 충족 |
|---|---|
| 소스 코드 분석 및 웹 호환 여부 검토 | 본 보고서 + 모든 PROGRESS.md (소스 부재 사실 확인, .exe가 Director임 확정) |
| 렌더링/그래픽 → Canvas/WebGL | Approach 1 — Canvas 2D 렌더러 |
| 오디오 → Web Audio API | Approach 1 — 합성 SFX |
| 입력 → 브라우저 이벤트 | Approach 1 — 마우스/키보드 핸들러 |
| 리소스(이미지/사운드) 웹 포맷 변환 | Approach 1 — 도트 캐릭터 묘사로 대체 (원본 .dir 캐스트 추출은 Approach 2 다음 단계) |
| 빌드 시스템 (Vite 또는 Webpack) | Approach 1 — Vite |
| 통합 테스트 (Playwright) | Approach 1 — Playwright 6 시나리오 PASS |
| TDD 방법론 | Approach 1 — Vitest 44 단위 테스트 (테스트 → 구현 순) |
| 세션 중단 시 재개 가능 (MD 파일) | 모든 폴더의 `PROGRESS.md` |
| 커밋/푸시 안 함 | 준수 (git 명령 미실행) |

## 추천 다음 단계 (사용자 판단)

1. **즉시 플레이 가능한 결과를 원할 때** → Approach 1 (`npm run dev`) 또는 Approach 3 (Ruffle 정적 페이지). Approach 3는 원작 Flash 그대로의 게임 경험.
2. **원본 .exe의 정확한 게임 로직을 복원하고 싶을 때** → Approach 2의 다음 단계(ProjectorRays 빌드)를 진행. strings로 추출된 레벨 데이터/캐스트명을 Approach 1의 명세로 사용해 "원작 충실 모드"를 추가하는 것도 가능.
3. **장기적으로** → Approach 1의 TypeScript 코드베이스 위에 Approach 2에서 복원된 Lingo 로직(레벨 곡선, AI 행동, 사운드 큐) 및 Approach 3 SWF에서 추출 가능한 비트맵 자산을 통합하면 "원작 충실 + 모던 웹 + 테스트 가능" 셋이 모두 만족됨.
