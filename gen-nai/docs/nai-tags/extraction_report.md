# NAIHelper Static IP Extraction Report

**작성:** catalog-synthesizer (Phase 3)
**일자:** 2026-05-18
**대상:** NAIHelper APK (`com.choo.naihelper`)
**위협 모델:** 앱 클로너에 의한 카탈로그 무단 추출 (런타임/네트워크 미수행, 정적 분석만)
**보호 자산:** NAI 태그 / 캐릭터 / 작품 / 아티스트(그림체) 카탈로그

---

## 1. 개요

NAIHelper는 NovelAI 이미지 생성 클라이언트로, 사용자가 NAI 태그/캐릭터/작품/아티스트 사전을 손쉽게 탐색·즐겨찾기·프롬프트로 조립하도록 돕는다. 본 보고서는 APK 자산(`assets/*.jsonl`)과 디컴파일 코드(jadx)에서 정적으로 추출 가능한 카탈로그를 표준 스키마로 합성하고, 클로너가 동일 카탈로그를 얼마나 쉽게 빼낼 수 있는지를 정량화한다.

**핵심 결론 — 카탈로그 IP 보호 등급: 사실상 0.** 모든 카탈로그는 평문 JSONL 자산으로 박혀 있고, 난독화·암호화 일체 없음. `unzip`만 있으면 30초 내 100% 복제 가능.

---

## 2. 추출 통계

| 카탈로그 | 항목 수 | 평균 confidence | 1차 출처 | 난이도 |
|---|---:|---:|---|---|
| **tags** | 23,095 | 0.9900 | `assets/danbooru_tags_slim.jsonl` | trivial |
| **characters** | 2,052 | 0.9505 | `assets/default_character_tags.jsonl` (53) + `danbooru_tags_slim.jsonl`의 `path[0]=Characters` (1,999) | trivial |
| **works** | 1,999 | 0.9500 | `danbooru_tags_slim.jsonl`의 `path[0]=Copyrights` | trivial |
| **artists** | 79 | 0.9900 | `assets/default_style_presets.jsonl` | trivial |
| **(보조) PNG meta artist prompts** | 51 | n/a | `assets/default_character_tag_thumbnails/*.png` (PNG tEXt) | trivial |

**난이도 분포:** 4종 카탈로그 전부 `trivial` (100%). `easy` 이상 난이도가 필요한 항목 0건.

### 태그 카테고리 분포 (path[0])
```
Wardrobe       4984    Objects        2868    Miscellaneous  2148
Copyrights     1999    Characters     1999    Appearance     1744
Subject        1454    Visual         1281    Action         1179
Sexual         1046    Scene           934    Meta            815
Relationship    455    Mood            189
```
주목: `Artists` 카테고리는 danbooru_tags_slim.jsonl 안에 **0건**. 즉 아티스트 사전은 풀 형태로 박혀 있지 않고, 오직 79개 큐레이션 style preset(번들 형태)으로만 존재.

### 캐릭터 통합 결과
- 큐레이션 53 (한국 IP·메이플·마비노기·디지몬·블루아카·LOL 등)
- danbooru 풀 1,999 (`tags.path[0]=Characters`)
- **norm(tagValue) 기준 교집합: 0건** — 두 출처는 사실상 disjoint. (큐레이션은 자체 IP 보강용, danbooru는 일반 풀)
- union = 2,052, dedup loss 0

### 아티스트 통합 결과
- style_presets.json: 79건 (각 preset 안에 평균 10여 개 `artist: name` 가중치 prompt)
- danbooru Artists 풀: **0건** (앱이 아티스트 풀 자체를 패키징하지 않음)
- PNG 메타 NAI prompt: 51개 (Phase에서 `_workspace/04_catalog/artist_prompts_from_pngs.json` 별도 보존)
- preset prompt에서 추출된 raw artist 키워드 합계 약 600건 — 단, danbooru 카탈로그 측에 매칭되는 항목 **0건** (앞서 말한 이유)

### 작품(Copyrights) 카탈로그
- `tags.json` 내 `path[0]="Copyrights"` 단일 추출 → 1,999건 (요청 명세대로 일치)
- 캐릭터의 work_id 매핑: 2,052 캐릭터 중 **669건(32.6%)**이 name_en 괄호 패턴(`name (work)`)으로 work_id 자동 연결됨

---

## 3. 추출 경로 표

| # | 경로 | 등급 | 도구 | 항목 수 | 추출 명령 1줄 |
|---|---|---|---|---:|---|
| P0-1 | `assets/danbooru_tags_slim.jsonl` | trivial | `unzip` + `cat` | 23,095 (tags 전부 + chars 1,999 + works 1,999 포함) | `unzip -p naihelper.apk assets/danbooru_tags_slim.jsonl > tags.jsonl` |
| P0-2 | `assets/default_character_tags.jsonl` | trivial | `unzip` | 53 (큐레이션 캐릭터) | `unzip -p naihelper.apk assets/default_character_tags.jsonl > chars.jsonl` |
| P0-3 | `assets/default_style_presets.jsonl` | trivial | `unzip` | 79 (그림체 프리셋) | `unzip -p naihelper.apk assets/default_style_presets.jsonl > styles.jsonl` |
| P1-1 | `assets/default_wildcards.jsonl` | trivial | `unzip` | 19 풀 / 509 items | `unzip -p naihelper.apk assets/default_wildcards.jsonl > wild.jsonl` |
| P1-2 | `assets/default_tag_image_map.json` | trivial | `unzip` | 161 매핑 | `unzip -p naihelper.apk assets/default_tag_image_map.json > tagmap.json` |
| P1-3 | `assets/default_character_tag_thumbnails/*.png` (tEXt 메타) | trivial | `unzip` + `exiftool` 또는 `python -c PIL` | 161 PNG, 51개에 NAI prompt 평문 (그림체 가중치 포함) | `exiftool -j -G assets/default_character_tag_thumbnails/*.png` |
| P2-1 | `classes*.dex` 디컴파일로 데이터 클래스 스키마 복원 | medium | `jadx` + `grep` | 5종 로더 클래스 + 9개 데이터 클래스 | `jadx -d out app.apk && rg -n 'data class' out/sources/com/choo/naihelper` |

---

## 4. 클로너 시나리오 추정

### 시나리오 A — "30초 룰" (Pure unzip)
```bash
unzip naihelper.apk -d ext/
ls ext/assets/*.jsonl ext/assets/*.json
```
산출: 5종 자산 평문 손에 들어옴. **카탈로그 100% 재구성에 필요한 데이터 전부 포함.**
**소요: 5분 미만 (30초 unzip + 4분 30초 Python 30줄로 jsonl→사용 모델).**

### 시나리오 B — "그림체 더 깊이" (PNG meta까지)
시나리오 A + `exiftool -j ext/assets/default_character_tag_thumbnails/*.png` →
51장의 NAI Diffusion V4.5 prompt(아티스트 가중치 포함)와 negative prompt 통째로 노출.
이는 NAIHelper 큐레이터가 어떤 prompt 조합으로 캐릭터 썸네일을 만들었는지 그대로 복제 가능.
**소요: 10분.**

### 시나리오 C — "스키마 자동화 클론" (jadx까지)
시나리오 B + `jadx app.apk` → `TagEntry`, `PositivePreset`, `WildcardSet`, `AssetTagRow`, `DefaultWildcardRow`, `NovelAiGenerationSettings` 등 데이터 클래스 풀네임 보존된 채 복원.
파이썬 dataclass 또는 Kotlin data class로 1:1 변환 가능. 자기 앱에 동일 모델 + 로더 패턴 그대로 이식.
**소요: 30분 ~ 1시간.**

### 시나리오 D — "API 토큰 추가 탈취 (실패)"
`NovelAiApiClient.java`에 NAI API 토큰은 **하드코딩되어 있지 않음**. 사용자 SharedPreferences에서 매번 읽음. 따라서 클론 앱은 "엔드유저가 자기 NAI 토큰을 입력해야 작동" 구조. → 본인 앱의 핵심 비즈니스 가치(API 호출 권한)는 보존됨. 카탈로그 IP만 노출됨.

---

## 5. 앱 핵심 가치 보존 평가

| 자산 | 상태 | 비고 |
|---|---|---|
| 카탈로그 IP (태그/캐릭터/작품/아티스트) | **노출됨 (trivial)** | 모든 자산 평문 JSONL |
| NAI API 토큰 | **보존됨** | 하드코딩 없음, 사용자 입력 |
| 모델 호출 권한 | **보존됨** | 토큰 종속 |
| 큐레이션 노하우 (style preset 79개) | **노출됨 (trivial)** | prompt + negative prompt + 메타 전부 평문 |
| 캐릭터 썸네일 NAI prompt 51건 | **노출됨 (trivial)** | PNG tEXt에 박힘 |
| 사용자 데이터 (즐겨찾기 등) | **N/A** | SharedPreferences에 디바이스별 저장 |

요약: **앱의 "지식 자산"은 사실상 무방비**, **"호출 권한"은 사용자 토큰 의존으로 자동 보호됨**.

---

## 6. 잔존 위험 (정적 분석 범위 외)

- 동적 분석 미수행. 만약 사용자 입력 NAI 토큰이 디바이스 키체인이 아닌 SharedPreferences에 평문 저장된다면, 루팅 단말에서 토큰 추가 노출 가능 (Phase 외부 사항).
- `NovelAiApiClient`가 `HttpURLConnection` 직접 호출 → certificate pinning 미적용 가능성. MITM으로 토큰/카탈로그 캡처 가능 여부는 동적 검증 필요.
- 사용자 SharedPreferences 기반 추가 카탈로그 (TagFavoriteStore, TagOverrideStore 등)는 디바이스마다 다르므로 정적 추출 대상 아님.

---

## 7. 자체 검증

- 4종 JSON sources 비어있는 항목: **0건**
- id 중복: **0건**
- confidence 0~1 범위 위반: **0건**
- extraction_difficulty enum 위반: **0건**
- PII 검출 (이메일·UID·디바이스 ID): **0건** (1,000개 태그 sample + 53 char + 79 preset 스캔)
- 스키마 검증 통과

---

## 8. 산출물

- `output/tags.json` (23,095)
- `output/characters.json` (2,052)
- `output/works.json` (1,999)
- `output/artists.json` (79)
- `output/extraction_report.md` (이 문서)
- `_workspace/04_catalog/artist_prompts_from_pngs.json` (51, PNG tEXt raw NAI prompt)
- `_workspace/04_catalog/synth_stats.json` (합성 통계 raw)
- `_workspace/04_catalog/synth.py` (재현 스크립트)
