# Approach 2: Decompile Snowcraft.exe

## 시작 시각
2026-05-29 11:59:25 KST

## 종료 시각
2026-05-29 12:01 KST (약 2분)

## 상태
**부분 성공** — 임베디드 콘텐츠 추출 성공. Lingo 바이트코드 디컴파일은 미완료.

## 핵심 발견 (가설 수정)
원본 README는 "Flash 게임의 Windows 포트"로 추정했으나 **이는 틀렸다**:
- SWF 시그니처(FWS/CWS/ZWS) 0개 발견
- **Macromedia Director 6.0 Projector**임 (Flash 아님)
- 임베디드 무비 포맷: **RIFX / MV93** (Director MX/6.x 무비)
- approach-3-ruffle은 Flash 전용이라 이 파일과 호환되지 않음 — Director 전용 도구 필요

## 시도한 분석
1. `file Snowcraft.exe` → PE32 GUI Intel 80386 (확인)
2. `xxd ... | head -20` → MZ/PE 헤더 정상
3. `strings -n 8` → "Director 6.0 ...", "Player.EXE", "Projector", "MacroMix",
   "Macromedia Director", "Macromedia Composition Engine" 다수 발견 → Director projector 확정
4. SWF magic 검색 (`grep -obaP '\x46\x57\x53|\x43\x57\x53|\x5a\x57\x53'`) → **0건**
5. RIFX magic 검색 (`grep -obaP 'XFIR'`) → 10개 위치 발견
6. Director 코덱 검색 (`grep -obaP '39VM|58VM'`) → 9개 위치 발견
7. 각 XFIR 위치를 Python으로 헤더 파싱 → 유효한 RIFX 컨테이너 2개 식별
8. `dd`로 두 RIFX 컨테이너 추출
9. 추출본의 strings 검사로 게임 콘텐츠 확인

## 발견 내용

### .exe 내부 RIFX 구조
- **offset 1498419** (0x16DD33): `XFIR` size=573416 codec=`APPL` — Director projector의 외부 APPL 래퍼
- **offset 1498781** (0x16DE9D): `XFIR` size=573054 codec=`MV93` — **실제 Director MX 무비**
  (APPL 컨테이너 내부에 중첩됨, 끝 offset = 2071843, 즉 EXE 끝 4바이트 전까지)
- 나머지 XFIR(147594-154313)은 RIFX 길이 필드가 비현실적 → 코드 영역의 우연 매치
- `39VM/59VM/58VM/79VM` 등 다수 토큰은 projector의 **지원 포맷 식별자 테이블** (코드 섹션)

### 추출된 게임 콘텐츠 (strings 결과)
- **저자**: wells packard - Nicholson | NY (mailto:wells@nny.com)
- **원본 빌드 경로**: `C:\WINNT\Profiles\wells\Desktop\snowcraft98\sc98_13.dir`
- **Lingo 스크립트 이름**: "GREEN DUDES SCRIPT", "RED DUDES SCRIPT", "movie script"
- **캐스트 멤버**: snowball, snowcraft_key, snowcraft_palatte, snowcraft_256,
  "Snowball red", "Snowballs Green", "R Auto walk_1", "R Auto walk_2"
- **사운드**: short_chirps, bird_tweets, "Whoosh Percusive"
- **레벨 데이터** (Lingo property list 그대로 노출됨):
  - `[#gd: 3, #level: 1]` → Level 1: 3 green dudes
  - `[#gd: 5, #level: 2]` → Level 2: 5
  - `[#gd: 7, #level: 3]` → Level 3: 7
  - `[#gd: 9, #level: 4]` → Level 4: 9
  - `[#gd: 12, #level: 5]` → Level 5: 12
  - 추가: `[#gd: 12, #level: 4]` (변형)
  - 화면 텍스트: "GreenWin", "Level 2..6", "Number of Green:"
- **Lingo 핸들러 시그니처**: exitFrame, mouseDown, mouseEnter, mouseLeave,
  beginSprite, prepareFrame, getPropertyDescriptionList, clearGlobals,
  puppetSound, soundBusy, spriteNum, "repeat While soundBusy(1)"

## 추출된 파일
- `/Users/jongwoopark/Downloads/temp/porting-web/snow-craft/approach-2-decompile/extracted/Snowcraft.MV93.dir` (573,062 bytes) — **Director MX 무비 본체** (게임 로직)
- `/Users/jongwoopark/Downloads/temp/porting-web/snow-craft/approach-2-decompile/extracted/Snowcraft.APPL.dir` (573,424 bytes) — APPL 래퍼 포함 버전 (참고용)

추출 명령 (재현용):
```sh
EXE=/Users/jongwoopark/Downloads/temp/porting-web/Snowcraft/EXE/Snowcraft.exe
dd if="$EXE" of=Snowcraft.MV93.dir bs=1 skip=1498781 count=573062
dd if="$EXE" of=Snowcraft.APPL.dir bs=1 skip=1498419 count=573424
```

## 막힌 지점
- macOS에 설치된 디컴파일러 도구 없음:
  - binwalk: 미설치 (그러나 Director 포맷은 binwalk가 더 잘 알지도 못함, 큰 손실 아님)
  - wine: 미설치 (있으면 OldWindowsApp/Director Player Win98과 함께 실행 가능)
  - ghidra/radare2/IDA: 미설치 (PE 디스어셈블 불가, 그러나 게임 로직은 .exe가 아니라 .dir에 있으므로 큰 의미 없음)
  - objdump: 있음 (그러나 PE의 .text 섹션 디스어셈은 게임 로직 추출에 불필요 — 로직은 Lingo 바이트코드)
- Director **Lingo 바이트코드를 텍스트 소스로 디컴파일**하는 도구는 매우 희귀하고 macOS에 기본 설치된 것 없음:
  - 알려진 도구: `ProjectorRays`(open-source), `Lingo Decompiler`, Adobe Director(상용, 단종),
    `OpenShockwave`, `dirOpener` 등 모두 별도 설치 필요
- 따라서 .dir 내부 Lingo 스크립트의 **소스 코드 복원은 이번 세션 도구로 불가능**
  (다만 strings로 핸들러명/캐스트명/리터럴 데이터는 이미 노출됨 — 게임 로직 재구성에 충분히 유용)

## 다음 단계 (사용자가 이어가기 위한 명령)

### 우선순위 1: ProjectorRays로 Lingo 디컴파일
ProjectorRays는 Director 무비를 Lingo 텍스트로 디컴파일하는 오픈소스 도구.
```sh
# (a) macOS에서 빌드
brew install cmake boost zlib mpg123
git clone --recursive https://github.com/ProjectorRays/ProjectorRays.git
cd ProjectorRays && cmake -B build && cmake --build build
# (b) 디컴파일 시도
./build/projectorrays decompile \
  /Users/jongwoopark/Downloads/temp/porting-web/snow-craft/approach-2-decompile/extracted/Snowcraft.MV93.dir
```

### 우선순위 2: Wine + Director 6/Shockwave Player로 재생/검사
```sh
brew install --cask wine-stable
# 그런 다음 Director 6 Projector나 Shockwave Player 6.0.x를 Wine 안에 설치
# Snowcraft.MV93.dir을 .dir로 열거나, 추출본을 그대로 wine으로 .exe 실행
wine /Users/jongwoopark/Downloads/temp/porting-web/Snowcraft/EXE/Snowcraft.exe
```

### 우선순위 3: 더 깊은 strings 마이닝
```sh
# 모든 Lingo handler 핸들러명/리터럴 추출
strings -n 4 extracted/Snowcraft.MV93.dir | sort -u > strings_all.txt
# 캐스트 멤버, 사운드, 텍스트 자원을 RIFX 청크 단위로 분리하려면
# 직접 RIFX 청크 파서를 작성 (chunk = 4-byte tag + 4-byte LE size + payload)
```

### 우선순위 4: 다른 접근법과의 정합
- approach-3-ruffle은 Flash 전용이라 사용 불가 → Director용 별도 트랙 필요
  (예: approach-4-projectorrays 또는 approach-4-rewrite-from-strings)
- approach-1-rebuild가 진행 중이라면 위 strings 결과(레벨별 GD 수, 사운드 이름,
  스크립트명)를 그대로 명세로 활용 가능

## 추출된 SWF
**없음** — 이 게임은 Flash가 아니라 Macromedia Director 6.0 작품이므로 SWF 미존재.
대신 추출된 Director 무비:
`/Users/jongwoopark/Downloads/temp/porting-web/snow-craft/approach-2-decompile/extracted/Snowcraft.MV93.dir`
