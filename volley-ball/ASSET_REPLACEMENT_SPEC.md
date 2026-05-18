# Asset Replacement Specification

이 문서는 이 게임의 그래픽·사운드 자산을 동일 해상도의 다른 이미지/소리로 교체하기 위한 단일 진실 명세서다. 사용자가 새 자산 한 세트를 준비해 게임에 통합할 때 어떤 파일을 어떤 크기·포맷·이름으로 만들어야 하는지를 빠짐없이 안내한다.

---

## 1. Overview

| 항목 | 값 |
|------|----|
| 캔버스 (논리 해상도) | **432 × 304** px |
| 스프라이트 시트 (`sprite_sheet.png`) | **476 × 885** px |
| 시트 포맷 | RGBA8888 (PNG-32, 알파 채널) |
| 프레임 수 | **77** |
| 렌더링 모드 | `SCALE_MODE = NEAREST` + `image-rendering: pixelated` (픽셀 아트) |
| Pixel resolution multiplier | 2 (CSS scale) — 원본 해상도로 그려도 화면에서는 2배로 보임 |
| 좌표 메타 | `src/assets/images/sprite_sheet.json` (TexturePacker 형식) |

게임은 PixiJS 6.x의 `Loader`로 sprite_sheet.json을 읽고, 각 프레임을 `TEXTURES.PIKACHU(i, j)` 같은 키 함수로 참조한다. **좌표/이름을 바꾸면 코드가 깨진다.** 색·픽셀 패턴만 바꾸고 좌표·크기는 유지하는 것이 권장.

---

## 2. 교체 워크플로우 선택

두 가지 중 하나를 선택한다. 둘 다 동일 결과를 낳지만 작업 도구가 다르다.

### 방식 A — 개별 PNG 파일로 작업하고 재패킹 (권장)

- **장점:** 카테고리/이름 단위로 작업하기 쉽다, 향후 추가/수정 용이
- **단점:** TexturePacker 같은 도구 필요
- **흐름:**
  1. `assets_src/` 폴더에 본 명세의 폴더 구조(예: `pikachu/pikachu_0_0.png`) 그대로 PNG 개별 파일을 만든다
  2. TexturePacker(또는 동등 도구)로 합성 → 새 `sprite_sheet.png` + `sprite_sheet.json` 생성
  3. `src/assets/images/`의 기존 2개 파일을 새 파일로 덮어쓴다

### 방식 B — 합쳐진 시트 한 장만 교체

- **장점:** 도구 불필요, 단일 PNG만 교체
- **단점:** 픽셀 단위로 정확하게 정렬해야 함, 좌표 변경 불가
- **흐름:**
  1. 기존 `sprite_sheet.json`의 각 프레임 (x, y, w, h)을 참고하여 새 476×885 PNG에 동일한 위치로 새 그림을 배치
  2. `src/assets/images/sprite_sheet.png`만 교체 (json은 건드리지 않음)

---

## 3. 이미지 자산 카탈로그

### 3.1 피카츄 캐릭터 — `pikachu/pikachu_{state}_{frame}.png`

모든 프레임 **64 × 64**, 투명 배경.

| state | frame 수 | 의미 (physics.js 추론) |
|-------|----------|-----------------------|
| 0 | 5 (0~4) | **idle / 걷기** — 정지 또는 좌우 이동 |
| 1 | 5 (0~4) | **점프 상승** — 위로 도약 |
| 2 | 5 (0~4) | **점프 하강** — 떨어지는 중 |
| 3 | 2 (0~1) | **다이빙/공격 준비** — 다이빙 자세 |
| 4 | 1 (0) | **강타 / 파워히트** — 공을 칠 때 한 프레임 |
| 5 | 5 (0~4) | **승리 애니메이션** — 라운드/세트 종료 후 |
| 6 | 5 (0~4) | **패배 애니메이션** — 라운드/세트 종료 후 |

총 **28 프레임**. 각 state 내 frame은 애니메이션 시퀀스이므로 자연스러운 흐름이 되어야 한다.

| 파일명 | 시트 좌표 (x, y) | 크기 |
|-------|-----------------|------|
| pikachu/pikachu_0_0.png | (2, 266) | 64×64 |
| pikachu/pikachu_0_1.png | (68, 266) | 64×64 |
| pikachu/pikachu_0_2.png | (134, 266) | 64×64 |
| pikachu/pikachu_0_3.png | (200, 266) | 64×64 |
| pikachu/pikachu_0_4.png | (266, 266) | 64×64 |
| pikachu/pikachu_1_0.png | (332, 266) | 64×64 |
| pikachu/pikachu_1_1.png | (398, 266) | 64×64 |
| pikachu/pikachu_1_2.png | (2, 332) | 64×64 |
| pikachu/pikachu_1_3.png | (68, 332) | 64×64 |
| pikachu/pikachu_1_4.png | (134, 332) | 64×64 |
| pikachu/pikachu_2_0.png | (200, 332) | 64×64 |
| pikachu/pikachu_2_1.png | (266, 332) | 64×64 |
| pikachu/pikachu_2_2.png | (332, 332) | 64×64 |
| pikachu/pikachu_2_3.png | (398, 332) | 64×64 |
| pikachu/pikachu_2_4.png | (2, 398) | 64×64 |
| pikachu/pikachu_3_0.png | (68, 398) | 64×64 |
| pikachu/pikachu_3_1.png | (134, 398) | 64×64 |
| pikachu/pikachu_4_0.png | (200, 398) | 64×64 |
| pikachu/pikachu_5_0.png | (266, 398) | 64×64 |
| pikachu/pikachu_5_1.png | (332, 398) | 64×64 |
| pikachu/pikachu_5_2.png | (398, 398) | 64×64 |
| pikachu/pikachu_5_3.png | (2, 464) | 64×64 |
| pikachu/pikachu_5_4.png | (68, 464) | 64×64 |
| pikachu/pikachu_6_0.png | (134, 464) | 64×64 |
| pikachu/pikachu_6_1.png | (200, 464) | 64×64 |
| pikachu/pikachu_6_2.png | (266, 464) | 64×64 |
| pikachu/pikachu_6_3.png | (332, 464) | 64×64 |
| pikachu/pikachu_6_4.png | (398, 464) | 64×64 |

**플레이어 좌/우 구분 없음.** view.js가 player 2 쪽일 때 좌우 반전(`scale.x = -1`)으로 그린다. 따라서 한 방향만 그리면 된다(왼쪽 보기).

**좌우 반전 대칭성에 유의.** 비대칭 디자인(예: 한쪽 어깨에만 표식)은 반전 시 어색할 수 있다.

### 3.2 앉은 피카츄 — `sitting_pikachu.png`

| 파일명 | 크기 | 시트 좌표 | 용도 |
|--------|------|-----------|------|
| sitting_pikachu.png | **104 × 104** | (280, 611) | 인트로/메뉴 화면 등장 캐릭터 |

### 3.3 공 — `ball/ball_*.png`

모든 프레임 **40 × 40**, 투명 배경.

| 파일명 | 시트 좌표 | 용도 |
|--------|-----------|------|
| ball/ball_0.png | (88, 158) | 회전 시퀀스 프레임 0 |
| ball/ball_1.png | (130, 158) | 회전 시퀀스 프레임 1 |
| ball/ball_2.png | (172, 158) | 회전 시퀀스 프레임 2 |
| ball/ball_3.png | (214, 158) | 회전 시퀀스 프레임 3 |
| ball/ball_4.png | (256, 158) | 회전 시퀀스 프레임 4 |
| ball/ball_hyper.png | (298, 158) | 하이퍼 (강한 회전 또는 특수 상태) |
| ball/ball_punch.png | (340, 158) | 강타 직후 잔상 효과 |
| ball/ball_trail.png | (382, 158) | 궤적 잔상 |

### 3.4 점수 숫자 — `number/number_{0..9}.png`

모든 프레임 **32 × 32**, 투명 배경. 게임 좌상단 (player1) / 우상단 (player2)에 점수 표시.

| 파일명 | 시트 좌표 |
|--------|-----------|
| number/number_0.png | (204, 124) |
| number/number_1.png | (238, 124) |
| number/number_2.png | (272, 124) |
| number/number_3.png | (306, 124) |
| number/number_4.png | (340, 124) |
| number/number_5.png | (374, 124) |
| number/number_6.png | (408, 124) |
| number/number_7.png | (442, 124) |
| number/number_8.png | (2, 158) |
| number/number_9.png | (36, 158) |

### 3.5 배경 오브젝트 — `objects/*.png`

| 파일명 | 크기 | 시트 좌표 | 역할 |
|--------|------|-----------|------|
| objects/sky_blue.png | 16×16 | (156, 2) | 하늘 타일 (반복) |
| objects/mountain.png | **432×64** | (2, 200) | 배경 산 (캔버스 가로 전체) |
| objects/cloud.png | 48×24 | (100, 90) | 구름 (다수 인스턴스 + 부드러운 이동) |
| objects/wave.png | 16×32 | (70, 158) | 파도/물결 (반복) |
| objects/ground_red.png | 16×16 | (120, 2) | 코트 빨간 부분 |
| objects/ground_yellow.png | 16×16 | (138, 2) | 코트 노란 부분 (모래) |
| objects/ground_line.png | 16×16 | (66, 2) | 코트 라인 (중앙용) |
| objects/ground_line_leftmost.png | 16×16 | (84, 2) | 라인 좌측 끝 |
| objects/ground_line_rightmost.png | 16×16 | (102, 2) | 라인 우측 끝 |
| objects/net_pillar.png | 8×8 | (12, 2) | 네트 기둥 (수직 반복) |
| objects/net_pillar_top.png | 8×8 | (22, 2) | 네트 기둥 상단 |
| objects/shadow.png | 32×8 | (32, 2) | 캐릭터/공 그림자 |
| objects/black.png | 8×8 | (2, 2) | 페이드인/아웃용 검정 |

### 3.6 공통 메시지 — `messages/common/*.png`

| 파일명 | 크기 | 시트 좌표 |
|--------|------|-----------|
| messages/common/sachisoft.png | 360×20 | (2, 20) |
| messages/common/ready.png | 80×24 | (222, 64) |
| messages/common/game_end.png | 96×24 | (124, 64) |

### 3.7 일본어 메시지 — `messages/ja/*.png`

| 파일명 | 크기 | 시트 좌표 |
|--------|------|-----------|
| messages/ja/mark.png | 88×110 | (386, 611) |
| messages/ja/pokemon.png | 200×32 | (150, 90) |
| messages/ja/pikachu_volleyball.png | 276×79 | (2, 530) |
| messages/ja/fight.png | 160×160 | (92, 723) |
| messages/ja/with_computer.png | 120×20 | (2, 42) |
| messages/ja/with_friend.png | 120×20 | (124, 42) |
| messages/ja/game_start.png | 96×24 | (304, 64) |

### 3.8 한국어 메시지 — `messages/ko/*.png`

| 파일명 | 크기 | 시트 좌표 |
|--------|------|-----------|
| messages/ko/mark.png | 88×110 | (2, 723) |
| messages/ko/pokemon.png | 200×32 | (2, 124) |
| messages/ko/pikachu_volleyball.png | 276×79 | (2, 611) |
| messages/ko/fight.png | 160×160 | (254, 723) |
| messages/ko/with_computer.png | 120×20 | (246, 42) |
| messages/ko/with_friend.png | 120×20 | (2, 64) |
| messages/ko/game_start.png | 96×24 | (2, 90) |

**참고:** 현재 코드(`view.js`)는 한 시점에 한 언어만 표시한다. 새 게임이 단일 언어라면 한 폴더만 의미가 있다. 그러나 좌표는 시트에 박혀 있으므로 사용하지 않더라도 자리는 비워두지 말 것(투명 픽셀로 채우면 됨).

**자산 총합:** 28(피카츄) + 1(앉은) + 8(공) + 10(숫자) + 13(배경) + 3(공통) + 7(ja) + 7(ko) = **77** ✓

---

## 4. 포맷 요구사항

### 4.1 이미지

- **포맷:** PNG-32 (RGBA), 알파 채널 보존
- **색공간:** sRGB
- **압축:** 무손실 (PNG)
- **렌더링:** `SCALE_MODE = NEAREST` 사용. **안티앨리어싱 없는 또렷한 픽셀**로 그릴 것
- **해상도:** 1× (캔버스 432×304 논리 좌표 기준). 더 큰 해상도로 그려서 다운샘플링하지 말 것 (또는 NEAREST로 다운샘플링)
- **알파 모서리:** 캐릭터/공/숫자/메시지는 배경이 완전 투명이어야 함. 반투명 안티앨리어스 가장자리는 픽셀 아트와 어울리지 않음
- **시트 크기 (방식 B):** 정확히 **476 × 885 px**. 단 1픽셀이라도 빗나가면 sprite_sheet.json 좌표가 어긋남

### 4.2 디자인 가이드

- **팔레트:** 원본은 16~32색 정도의 제한된 팔레트 (PC-98 풍 픽셀 아트). 새 디자인도 비슷한 색상 수를 유지하면 일관된 분위기
- **외곽선:** 1픽셀 검정 외곽선 권장 (캐릭터/공/숫자에서 두드러진 시인성 확보)
- **방향성:** 피카츄는 한 방향(왼쪽 보기)만 그리면 됨. 게임이 자동 좌우 반전
- **앵커:** view.js는 일부 스프라이트에 `anchor.set(0.5, 0.5)` 등을 사용. 캐릭터·공은 중심 기준이므로 64×64 캔버스 중앙에 그릴 것

---

## 5. 사운드 자산

총 **8개** 파일.

| 파일 | 상수 키 (`ASSETS_PATH.SOUNDS.*`) | 트리거 시점 | 권장 포맷 |
|------|----------------------------------|------------|-----------|
| bgm.mp3 | BGM | 게임 진행 중 루프 재생 | MP3 128kbps, 30초~2분 (자연스러운 루프) |
| WAVE140_1.wav | PIPIKACHU | "삐삐까!" — 공 컨택 또는 특정 응원 | WAV 22kHz mono, 0.5~1.5초 |
| WAVE141_1.wav | PIKA | 일반 점프/짧은 외침 | WAV 22kHz mono, 0.3~0.8초 |
| WAVE142_1.wav | CHU | 짧은 효과음 | WAV 22kHz mono, 0.2~0.5초 |
| WAVE143_1.wav | PI | 짧은 효과음 | WAV 22kHz mono, 0.2~0.5초 |
| WAVE144_1.wav | PIKACHU | 일반 외침 | WAV 22kHz mono, 0.5~1.0초 |
| WAVE145_1.wav | POWERHIT | 강타(파워히트) 효과 | WAV 22kHz mono, 0.3~0.6초 |
| WAVE146_1.wav | BALLTOUCHESGROUND | 공이 바닥 닿을 때 (실점) | WAV 22kHz mono, 0.3~0.6초 |

### 사운드 호환성 노트

- WAV는 PCM, 22050 Hz, 16-bit, mono 권장 (원본과 동일)
- 다른 샘플레이트도 PixiJS sound 라이브러리가 디코딩 가능하지만 통일하는 편이 안전
- BGM은 MP3로 유지. OGG로 바꾸려면 `audio.js`의 확장자도 같이 변경 필요

---

## 6. 방식 A 워크플로우 (재패킹)

### 6.1 소스 폴더 구조

```
assets_src/
├── pikachu/
│   ├── pikachu_0_0.png   (64×64)
│   ├── pikachu_0_1.png
│   ├── ... (28개)
├── sitting_pikachu.png   (104×104)
├── ball/
│   ├── ball_0.png        (40×40)
│   ├── ball_1.png
│   ├── ... (8개)
├── number/
│   ├── number_0.png      (32×32)
│   ├── ... (10개)
├── objects/
│   ├── sky_blue.png      (16×16)
│   ├── mountain.png      (432×64)
│   ├── ... (13개)
└── messages/
    ├── common/           (3개)
    ├── ja/               (7개)
    └── ko/               (7개)
```

### 6.2 이 저장소에 포함된 도구 (권장)

이 프로젝트는 외부 TexturePacker 없이도 방식 A를 수행할 수 있도록 **고정 기능** 합성기를 포함한다. 기존 `sprite_sheet.json`의 좌표를 그대로 사용하므로 좌표 재계산이 없어 view.js와 항상 호환된다.

```bash
# 1) 현재 시트를 77개의 개별 PNG로 분해 (이미 실행되어 있다면 다시 실행 불필요)
npm run extract:sprites
# → assets_src/{pikachu, ball, number, objects, messages, sitting_pikachu.png}/...

# 2) assets_src/에서 원하는 PNG를 동일 크기로 교체

# 3) 변경된 assets_src/를 다시 시트로 합성
npm run pack:sprites
# → src/assets/images/sprite_sheet.png 갱신 (sprite_sheet.json은 건드리지 않음)
```

**합성기의 안전 가드:**
- 입력 PNG의 크기가 layout과 다르면 즉시 에러를 던지며 어떤 파일이 문제인지 알려준다 (예: `pikachu_0_0.png: expected 64x64, got 32x32`)
- 모든 77개 파일이 `assets_src/`에 존재해야 한다. 일부만 교체할 때도 다른 파일들은 그대로 두면 된다 (분해 시 모두 만들어졌으므로 자동으로 만족)
- 좌표는 기존 `sprite_sheet.json`에서 읽으므로 사용자가 좌표를 신경 쓸 필요 없음

**다른 도구로 만든 시트를 쓰고 싶다면 (선택)** — TexturePacker 등으로 자체 시트를 만들 때는 `--trim-mode None`을 사용하라. 자동 트리밍을 켜면 좌표가 달라져 view.js의 정렬이 어긋난다.

### 6.3 검증 (사용자 셀프 점검)

```bash
# 1. 시트 무결성 - 크기와 프레임 수가 그대로인가
file src/assets/images/sprite_sheet.png        # 476 x 885
node -e "console.log(Object.keys(require('./src/assets/images/sprite_sheet.json').frames).length)"   # 77

# 2. 자동화된 픽셀 round-trip 테스트 (개발자/CI용)
npm test
# → 4개 테스트 모두 PASS여야 함:
#   - extract produces all 77 sprites
#   - all 28 pikachu frames exist
#   - round-trip: extract -> pack reproduces frame pixels byte-perfect
#   - pack rejects mismatched sprite dimensions

# 3. 시각 검증 - dev 서버
npm start
# → http://localhost:8080/ 에서 인트로/메뉴/게임 정상 표시
# → 콘솔 에러 0개 (favicon 404는 무시)
```

### 6.4 시각 검증 가이드 (당신이 새 이미지를 만든 직후)

이 4단계로 새 자산을 통합한다:

1. **교체할 PNG를 `assets_src/` 안 동일 이름·동일 크기 파일로 저장.** 예: 새 피카츄를 `assets_src/pikachu/pikachu_0_0.png`에 덮어쓰기 (64×64 PNG-32).
2. **`npm run pack:sprites` 실행.** 크기 검증 통과 시 `src/assets/images/sprite_sheet.png`가 갱신된다. 에러가 나오면 메시지의 파일명·기대 크기를 확인하고 1번부터 다시.
3. **`npm start` 후 브라우저에서 확인.** 인트로 → Enter → 게임 화면에서 캐릭터가 자연스럽게 움직이는지, 알파 누락(흰 테두리)이 없는지 본다.
4. **(선택) `npm test`로 round-trip 무결성 재확인.** 픽셀 단위로 mismatch가 없는지 자동 검증.

### 6.5 분해/합성 도구의 동작 원리

- `scripts/extract-sprites.js` — `sprite_sheet.json`의 각 프레임 (x, y, w, h)를 읽어, `sprite_sheet.png`의 해당 픽셀 사각형을 그대로 잘라 개별 PNG로 저장 (RGBA8888, 알파 보존)
- `scripts/pack-sprites.js` — 476×885 투명 캔버스를 만든 뒤, `assets_src/`의 각 PNG를 layout의 (x, y) 좌표에 정확히 paste. **bin packing 알고리즘 없음 — 고정 좌표 사용**
- 두 스크립트는 모두 `pngjs` 한 의존성만 사용하고 순수 Node.js로 동작 (네이티브 빌드 없음)

---

## 7. 방식 B 워크플로우 (시트 직접 교체)

### 7.1 절차

1. 기존 `src/assets/images/sprite_sheet.json`을 열어 모든 프레임의 (x, y, w, h)를 메모 (혹은 이 문서의 표 참고)
2. 그래픽 도구(예: Aseprite, Photoshop, Krita)에서 **정확히 476×885 px** 캔버스 생성, 배경 투명
3. 각 프레임 좌표에 새 그림을 정확히 배치 (픽셀 단위)
4. PNG-32로 저장 → `src/assets/images/sprite_sheet.png` 덮어쓰기
5. **`sprite_sheet.json`은 수정하지 않음** (좌표 그대로 유지)

### 7.2 픽셀 정확도 체크리스트

- 모든 프레임이 좌표 안에 정확히 들어가는가? (1픽셀 오차도 어긋남으로 보임)
- 프레임 간 경계의 빈 픽셀이 다른 프레임 영역을 침범하지 않는가? (NEAREST 스케일 시 새는 픽셀 발생)
- 알파 채널이 PNG로 저장되었는가? (JPEG 변환 금지)

### 7.3 권장 안전 마진

방식 B로 작업 시, 각 프레임 사방에 1픽셀의 투명 마진을 둔다(전체 시트 크기는 그대로 유지). NEAREST 스케일링 시 옆 프레임 픽셀이 새 들어오는 것을 막는다.

---

## 8. 교체 후 체크리스트

```bash
# 자산 파일 존재 + 크기 확인
ls -la src/assets/images/sprite_sheet.png  # ~107KB 정도
ls src/assets/sounds/  # 8개

# 빌드 통과
npm run build

# dev 서버 + 브라우저 확인
npm start
# → http://localhost:8080/ 에서 게임 캔버스 표시 + 콘솔 에러 0개
```

체크 항목:

- [ ] **시각** — 캐릭터 좌우 반전이 자연스러운가?
- [ ] **시각** — 점프 → 다이빙 → 강타 애니메이션 흐름이 끊기지 않는가?
- [ ] **시각** — 공 회전(ball_0~4)이 연속적으로 보이는가?
- [ ] **시각** — 점수 숫자가 0~9 모두 같은 양식인가?
- [ ] **시각** — 코트 라인이 가운데/끝에서 자연스럽게 이어지는가?
- [ ] **시각** — 그림자(shadow.png)가 캐릭터/공 아래에 정확히 위치하는가?
- [ ] **알파** — 캐릭터/공/숫자 주변에 흰 테두리가 새지 않는가?
- [ ] **사운드** — BGM이 끊김 없이 루프되는가?
- [ ] **사운드** — 효과음 길이가 너무 길어 게임 진행을 방해하지 않는가?
- [ ] **사운드** — 볼륨이 BGM과 효과음 사이에 균형 잡혀 있는가?
- [ ] **콘솔** — 브라우저 콘솔에 404나 디코딩 에러가 없는가?

---

## 9. 향후 자동화 (예고)

이 명세서를 기반으로, 사용자가 새 자산 폴더를 준비하면 자동으로 통합·검증하는 `asset-integrator` 에이전트를 향후 하네스에 추가할 수 있다. 그 때까지는 위 워크플로우를 수동으로 따른다.
