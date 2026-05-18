# Defense Brief — NAIHelper (`com.choo.naihelper`)

**작성:** defense-brief (Phase 4) · 2026-05-18
**총 추출 경로:** 7개 (trivial 6, medium 1) — `easy/hard` 0건
**핵심 위협:** 모든 카탈로그가 평문 JSONL/JSON/PNG-tEXt로 APK에 박혀 있어, `unzip` 1회로 30초 내 100% 복제됨. 난독화·암호화·무결성 검사 모두 부재.

---

## 우선순위 권고

### P0 (즉시) — 클론 30초 룰을 깨는 3건

1. **[trivial] `assets/danbooru_tags_slim.jsonl` (23,095 tags + 1,999 chars + 1,999 works 동시 노출)**
   - **Sourcing**: 자산 동봉 중단 → 첫 실행 시 서버 페치 + Play Integrity API attestation으로 게이팅. `DefaultTagAssetStore.kt` (jadx에서 풀네임 보존 확인됨)의 `getAssets().open("danbooru_tags_slim.jsonl")` 호출 제거하고 페이지네이션 API(`GET /catalog/tags?cursor=…`)로 교체.
   - 비용: 중 (서버 인프라 + 점진적 캐시) / 효과: 매우 높음. **이 한 건이 P0 위협의 80%를 가져감.**
   - 트레이드오프: 오프라인 첫 실행 불가 → 사용자 토큰 검증 후 부분 캐시(SQLCipher 등) 영구 저장으로 완화.

2. **[trivial] `assets/default_style_presets.jsonl` (큐레이션 그림체 79종, prompt+negative prompt 평문)**
   - **Sourcing**: 가장 차별화된 IP. 자산 제거하고 사용자별 권한 검증 후 서버 응답으로만 노출. `StylePresetLoader.loadPresets()` 시점에 토큰 헤더로 인증.
   - 비용: 낮음 (페이로드 작음) / 효과: 매우 높음.
   - 트레이드오프: 무료 게스트 사용자에게도 프리셋 보여주려면 별도 게스트 풀(축약본)이 필요.

3. **[trivial] `assets/default_character_tag_thumbnails/*.png` PNG tEXt 메타에 NAI Diffusion V4.5 prompt 51건 박힘**
   - **Hardening**: 빌드 파이프라인에서 `exiftool -all= *.png` 또는 `pngcrush -rem text -rem itxt` 일괄 적용. 추가로 썸네일 자체를 사이즈 64x64 jpeg로 다운스케일하면 prompt 추정 단서까지 약화.
   - 비용: 매우 낮음 (CI 후크 1줄) / 효과: 높음.
   - 트레이드오프: 없음. 메타는 사용자 가치 없음.

---

### P1 (단기) — 부수 자산 + 식별자 노출

4. **[trivial] `assets/default_character_tags.jsonl` (53), `assets/default_wildcards.jsonl` (19풀/509항목), `assets/default_tag_image_map.json` (161)**
   - **Sourcing**: P0-1과 동일 서버 카탈로그 엔드포인트로 묶어서 이전. 같은 `getAssets().open()` 패턴 일괄 제거.
   - 비용: 낮음 (P0-1 인프라 재사용) / 효과: 중. 트레이드오프: 없음.

5. **[trivial] 썸네일 PNG 자체 161장 (이미지 그 자체가 큐레이션 결과물)**
   - **Sourcing**: 썸네일은 CDN URL로 전환(`https://cdn.../thumb/{tagId}.webp`) + signed URL(15분 만료). 어차피 P0-3에서 메타 제거 시 같은 빌드 후크에 묶기.
   - 비용: 낮음 / 효과: 중. 트레이드오프: 첫 표시 지연 → diskCache(LRU 50MB) 권장.

6. **[medium] `DefaultTagAssetStore`, `TagEntry`, `PositivePreset`, `WildcardSet`, `AssetTagRow`, `DefaultWildcardRow`, `NovelAiGenerationSettings` 등 데이터 클래스 풀네임 + 필드명(`tagValue`, `taxonomyPathKo`) 그대로 노출**
   - **Hardening**: R8 활성화 + `@Keep` 최소화. 현재 `proguard-rules.pro`가 사실상 비어 있는 것으로 보임 (114/114 클래스 풀네임 보존 확인). data class는 Gson/Moshi 사용 시 `@SerializedName` 명시 후 식별자 단축 허용. R8 `-allowaccessmodification`, `-repackageclasses ''` 추가. 추가로 R8 `string-encryption`(AGP 8+ feature) 또는 stringConcealer 플러그인으로 잔존 상수 가림.
   - 비용: 중 (회귀 테스트 필요) / 효과: 중. **단독으론 카탈로그 노출을 막지 못함 — 반드시 P0-1/2/3과 함께.**
   - 트레이드오프: 리플렉션 호출(특히 Gson) 깨질 위험 → mapping.txt 보존 + Crashlytics 디옵스큐어 설정.

---

### P2 (장기/구조적) — 카탈로그 IP를 클라이언트에서 빼낸다

7. **카탈로그 서버화 + Play Integrity API attestation**
   - 위 P0/P1을 모두 수용하는 단일 백엔드. 디바이스 attestation 토큰을 매 요청 헤더에 강제하고, 비정상 단말(루팅·에뮬·재서명 APK)은 응답 거부. `NovelAiApiClient`가 이미 `HttpURLConnection`을 직접 호출하므로 인터셉터 추가 부담 작음.
   - 트레이드오프: Play Integrity 무료 쿼터(10K/일) 초과 시 비용 발생 → 사용자별 캐시 토큰 24시간 재사용.

8. **사용자별 부분 카탈로그 페치 (전체 23K 일괄 다운로드 금지)**
   - 카테고리(`Wardrobe/Characters/...`) 또는 즐겨찾기 컨텍스트 단위로만 응답. 1회 응답 ≤ 500항목 캡, 페이지네이션 강제. 한 디바이스가 24h 내 90% 이상 풀을 끌어가면 레이트리밋 + 알림.
   - 트레이드오프: 검색 UX 다소 느려짐 → 클라이언트 prefix-trie를 작은 단위로 캐시.

9. **한국어 번역분(`taxonomyPathKo`, `displayName_ko`) 별도 보호**
   - 본 앱의 가장 차별화된 자산. 영문 카탈로그와 분리된 번역 엔드포인트(`/i18n/ko/tags`)로 두고, 페이로드를 디바이스 키-derived AES로 한 번 더 감싼 후 스토리지에 저장. 클로너가 영문 풀은 외부 소스에서 합쳐도, 한국어 번역은 다시 만들어야 하도록 강제.
   - 트레이드오프: 디바이스 변경 시 재페치. UX 영향 미미.

---

## 채택 시 잔존 위험 (정적 분석 범위 외)

- **동적 분석 미수행**: Frida hook으로 `DefaultTagAssetStore` 메서드 반환값 메모리 덤프 가능성. 본 권고는 정적 추출만 막음. → RASP(예: AppSealing, Talsec) 또는 Frida 탐지 루틴 별도 검토 필요.
- **MITM 미수행**: `NovelAiApiClient`가 OkHttp가 아닌 `HttpURLConnection` 직접 사용 → certificate pinning 부재 가능성 높음. 서버화(P2-7) 수용 시 동시에 `OkHttp + CertificatePinner` 또는 Network Security Config `<pin-set>` 도입.
- **사용자 NAI 토큰 저장 형태 미검토**: SharedPreferences `novelai_api_token` 키. 디바이스 평문일 가능성. 루팅 단말에서 추가 노출 위험. → EncryptedSharedPreferences (Tink/AndroidX Security) 전환 권장. 본 보고서 범위 외이므로 별도 작업 항목으로.
- **마운트된 위협만 다룸**: 본 권고는 발견된 7개 추출 경로에 한함. 향후 자산 추가 시 동일 채굴 파이프라인 재실행 권장.
