# Snowcraft Web Port - Progress Log

## 시작 시각
2026-05-29 12:00 KST

## 종료 시각
2026-05-29 12:10 KST

## 상태
완료

## 개요
원본 Flash 기반 Snowcraft의 게임 메커니즘(README + MAIN.as 의사코드 + 5장의 스크린샷)을
참고하여 Vite + TypeScript + Canvas 2D + Web Audio API로 신규 구현한 웹 포팅.

## 디자인 노트 (스크린샷에서 추출)
- 캔버스: 800x500 (스크린샷 비율과 유사한 흰 눈밭)
- 좌측: 녹색 팀(플레이어 3명), 우측: 빨간 팀(CPU). 색상은 코드 변경으로 다른 팀 색상도 가능.
- 엄폐물(눈더미): 흰 둥근 타원으로 묘사
- 캐릭터: 머리(피부색) + 모자 + 통통한 몸통. 활성 캐릭터는 발 밑에 점선 타원 인디케이터.
- 눈덩이: 작은 흰 동그라미 + 그림자
- HP 바, 차지 게이지, 조준 점선 가이드 추가

## 완료된 단계
1. 자료 분석 (README, MAIN.as, 5장 스크린샷 멀티모달 확인)
2. Vite + TS + Vitest + Playwright 프로젝트 셋업
3. TDD 코어 로직
   - `Vector2`: 9 tests
   - `types/levelConfig`: 6 tests (level 100 의사코드 모순은 주석으로 명시)
   - `Player`: 9 tests (체력, 쿨다운, 이동, 클램프)
   - `Snowball`: 5 tests (이동, 수명, 항력, 경계)
   - `Game`: 11 tests (레벨 시작/진행, 던지기, 충돌, 팀-아군 미피해, 게임오버/레벨클리어)
   - `Input`: 4 tests (WASD/화살표 축, 차지 클램프)
4. Canvas 2D 렌더러 (배경 그라디언트, 엄폐물, 캐릭터 도트, 그림자, HP 바, 활성 인디케이터, 조준 라인, 차지 게이지, 단계별 오버레이)
5. Web Audio API 합성 사운드 (throw 휘슬, hit 노이즈 임팩트, level-clear 3음 멜로디)
6. 입력 시스템 (WASD/화살표 이동, 마우스 클릭&홀드 차지+릴리즈 던지기, Tab 활성 캐릭터 전환, Space로 다음 레벨/리스타트)
7. 디버그 훅 `window.__snowcraft` (E2E용)
8. Playwright E2E 6 시나리오 (페이지 로드, Start, 던지기, 마우스 차지, 레벨업, 게임오버)
9. 빌드 검증 통과

## 남은 단계
없음 — 모든 필수 요구사항 충족

## 막힌 지점
- **MAIN.as 의사코드 모순**: 의사코드는 "+2/level" 공식이지만 주석에 "level 100: 203"이라고 적혀 있음.
  3 + 99·2 = 201 이 실제 공식 결과. 명시적 공식을 우선 채택하고 테스트에 주석으로 기록함.
  (어차피 의사코드 자체가 불완전하므로 의도된 것은 "엄청 많아진다"는 정성적 의미.)

## 실행 방법
```bash
cd /Users/jongwoopark/Downloads/temp/porting-web/snow-craft/approach-1-rebuild
npm install                  # 1회
npx playwright install chromium   # 1회 (E2E 테스트용)

npm run dev                  # http://localhost:5173
npm test                     # Vitest 단위 테스트 (44개)
npm run test:e2e             # Playwright E2E 테스트 (6개)
npm run build                # 프로덕션 빌드 -> dist/
npm run preview              # 빌드된 결과물 4173 포트에서 미리보기
```

## 게임 조작
- **마우스 이동**: 조준
- **마우스 클릭&홀드 -> 릴리즈**: 차지하여 눈덩이 던지기 (홀드 1초가 풀차지)
- **WASD / 방향키**: 활성 캐릭터 이동
- **Tab**: 활성 캐릭터 전환
- **Space**: 레벨 클리어 후 다음 레벨 / 게임오버 후 재시작
- **Start 버튼**: 새 게임

## 테스트 결과 요약
- Vitest 단위 테스트: **44 passed / 44**
  - vector2: 9
  - types: 6
  - player: 9
  - snowball: 5
  - game: 11
  - input: 4
- Playwright E2E: **6 passed / 6**
  1. 페이지 로드 + 캔버스 렌더 검증
  2. Start 버튼으로 레벨 1 시작 + HUD 갱신
  3. 디버그 API로 던지기 + 강제 KO -> level-clear 전환
  4. 마우스 클릭 차지 후 릴리즈 -> 활성 플레이어 쿨다운 발생
  5. 레벨 클리어 상태에서 Space -> 레벨 2 진입
  6. 플레이어 강제 KO -> game-over 전환
- Production build: PASS (15.46 kB JS gzipped 5.50 kB)

## 디렉터리 구조
```
approach-1-rebuild/
├── PROGRESS.md
├── index.html
├── package.json / package-lock.json
├── tsconfig.json / vite.config.ts / vitest.config.ts / playwright.config.ts
├── src/
│   ├── main.ts                   # 진입점 (DOM 바인딩, RAF 루프, debug hook)
│   ├── style.css
│   ├── core/
│   │   ├── vector2.ts            # 2D 벡터
│   │   ├── types.ts              # TeamColor, levelConfig
│   │   ├── player.ts             # 캐릭터 상태
│   │   ├── snowball.ts           # 발사체
│   │   └── game.ts               # 월드 상태머신, AI, 충돌
│   ├── render/renderer.ts        # Canvas 2D 묘사
│   ├── audio/sfx.ts              # Web Audio API 합성 사운드
│   └── input/input.ts            # 입력 헬퍼
└── tests/
    ├── unit/*.test.ts            # Vitest 단위 테스트
    └── e2e/game.spec.ts          # Playwright E2E
```
