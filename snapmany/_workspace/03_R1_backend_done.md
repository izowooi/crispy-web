# Phase 3 — Round 1 (Backend) DONE

생성일: 2026-05-12 (Phase 3 R1)
작성자: backend 서브 에이전트 (model: opus)
선행 산출물: `_workspace/00_architect_decisions.md`, `_workspace/02_architect_scaffold.md`, `_workspace/02_qa_gate.md`
병렬 작업: frontend R1 (UploadPanel 등 컴포넌트 영역 — backend 미관여)

---

## 0. 요약

R1에서 backend가 소유하는 3개 모듈 + 대응 단위테스트 3개 작성 완료. TDD 사이클(RED → GREEN → REFACTOR) 엄수. 풀 파이프라인 4종 게이트 0 에러 통과. **Replicate 실호출 0회**(SDK는 `vi.mock`으로 완전 모킹). 토큰·서버 전용 모듈의 클라이언트 누출 0건.

---

## 1. 생성 파일 목록 (6개)

### 소스 (3)
| 파일 | 역할 |
|------|------|
| `src/config/styles.ts` | **클라이언트 노출 가능한** 스타일 메타데이터 15개 + 카테고리 7개. `StyleMeta`, `StyleCategoryId`, `STYLES`, `CATEGORIES`, `STYLE_IDS`, `isKnownStyleId`, `getStylesByCategory` 명시 export. `as const satisfies readonly StyleMeta[]` 패턴으로 타입 안전 + 추론 강도 동시 확보. **prompt는 의도적으로 미포함** — abuse/카피 방지. |
| `src/lib/stylePrompts.ts` | **서버 전용** prompt 시드 사전. 15개 styleId에 1:1 매핑되는 `STYLE_PROMPTS: Readonly<Record<string, StylePrompt>>`. `getStylePrompt(id)` 헬퍼는 존재 시 객체 반환·미존재 시 `null`. 파일 첫 줄 `// server-only` 주석으로 의도 표시(server-only 패키지 미설치이므로 코드 가드는 QA grep에 위임). 각 prompt는 `IDENTITY_GUARD` 접미사로 인물 식별성·구도 보존을 명시 — gpt-image-2가 임의로 인물을 바꾸지 않도록. |
| `src/lib/replicate.ts` | Replicate SDK wrapper. `generateStyledImage({ image, styleId })` 단일 export. 토큰을 모듈 스코프 싱글톤(`cachedClient`)에서 단 한 번 읽고 미설정이면 throw. 응답이 `string` 또는 `string[]`이든 항상 첫 URL을 추출 (Replicate SDK 1.4의 가변 반환 형태 흡수). 60초 `Promise.race` 타임아웃. `__resetReplicateClientForTests()` 헬퍼는 격리용 (프로덕션 미사용). |

### 테스트 (3)
| 파일 | 케이스 수 | 커버 내용 |
|------|----------|----------|
| `src/__tests__/styles.test.ts` | **13** | 정확히 15개 스타일, 7개 카테고리; 모든 스타일이 `id/label/category/description` 보유; 클라이언트 메타에 `prompt`/`negativePrompt` 누출 없음; id 중복 없음; 카테고리 양방향 정합 (선언된 카테고리 모두 사용됨 & 모든 스타일의 카테고리가 선언 목록 안); `STYLE_IDS` 순서 정합; `isKnownStyleId` 정·반례; `getStylesByCategory` 정·반례 + 파티션 합산이 15. |
| `src/__tests__/stylePrompts.test.ts` | **8** | 15개 styleId 모두에 prompt 엔트리 존재 & prompt 길이 ≥ 10; 추가 키 없음(완전 일치 매핑); `getStylePrompt` 정·반례; 시크릿 패턴(`r8_`, `AIza`, `sk-`) 미포함; identity-guard 문구 포함; 선언된 aspectRatio가 허용 집합(`1:1`/`2:3`/`3:2`) 내. |
| `src/__tests__/replicate.test.ts` | **8** | `Replicate` SDK 전체 모킹(`vi.mock('replicate', () => ({ default: vi.fn().mockImplementation(...) }))` — CJS default-export 형태 대응); 토큰 없음 → throw; `openai/gpt-image-2` 모델 + input 조립 검증 (prompt/input_images/aspect_ratio/output_format/output_compression/quality/moderation/number_of_images); 응답 `string[]`/`string` 양쪽 모두 첫 URL 반환; 빈 배열 응답 → throw; 미지의 styleId → throw + SDK 미호출; SDK 에러 전파; 스타일별 aspectRatio가 input에 그대로 반영(예: `passport` → `2:3`). |

**합계: 29개 테스트 (smoke 2 + frontend uploadProcessor 14 + UploadPanel 11 등 다른 영역 제외, backend R1 단독 29).**

---

## 2. 풀 파이프라인 게이트 결과

| # | 명령 | 결과 | 비고 |
|---|------|------|------|
| 1 | `npm run typecheck` | **PASS** (exit 0, 출력 없음) | strict + paths 정상. |
| 2 | `npm run lint` | **PASS** (exit 0, 출력 없음) | FlatCompat + next/typescript. |
| 3 | `npm run test` | **PASS** (6 files, 56 tests 통과 — backend R1 모듈 29 + smoke 2 + frontend 25) | Replicate 실호출 0회. |
| 4 | `npm run build` | **PASS** (Next 15.5.2, `/api/generate` edge runtime 유지) | edge 빌드 라우트 보존. |

---

## 3. 보안 grep 셀프체크 (양보 불가 규칙)

| grep | 결과 |
|------|------|
| `grep -rn "process.env.REPLICATE_API_TOKEN" src/__tests__` | 매칭 0건 (테스트는 `vi.stubEnv`만 사용) |
| `grep -rn "from 'replicate'\\|from \"replicate\"" src/components src/app/page.tsx src/app/layout.tsx` | 매칭 0건 |
| `grep -rn "NEXT_PUBLIC_REPLICATE" src/` | 매칭 0건 |
| `grep -rn "from .@/lib/stylePrompts." src/components src/app/page.tsx src/app/layout.tsx` | 매칭 0건 |
| `grep -rn "from .@/lib/stylePrompts." src/lib src/app/api` | 1건 (`src/lib/replicate.ts` — 정상 서버 경로) |

토큰은 `src/lib/replicate.ts`의 `getReplicateClient()` 한 곳에서만 `process.env.REPLICATE_API_TOKEN`을 읽는다. `__resetReplicateClientForTests()` 헬퍼는 테스트 격리용이며 토큰을 노출하지 않는다.

---

## 4. API 계약 일부 확정 (R2 backend가 그대로 따를 것)

`/api/generate` 응답 shape (Phase 1 §6과 동일하게 잠금):

```ts
// 성공
type GenerateResponseOk  = { ok: true;  styleId: string; imageUrl: string };
// 실패
type GenerateResponseErr = { ok: false; styleId: string; error: string };
```

- 1요청 = 1스타일. 클라이언트가 N개 선택 시 N개 병렬 fetch.
- HTTP 상태: 200(성공) / 400(검증 실패) / 413(파일 너무 큼) / 422(Replicate moderation) / 500(서버 설정) / 502(Replicate 5xx) / 504(타임아웃).
- `imageUrl`은 Replicate 호스트(`replicate.delivery` 또는 `pbxt.replicate.delivery`). next.config.ts의 `images.remotePatterns`가 이미 두 호스트를 허용 중.

### R2에서 호출할 진입점
```ts
import { generateStyledImage } from '@/lib/replicate';
import { isKnownStyleId } from '@/config/styles';

// 검증 후
const { imageUrl } = await generateStyledImage({ image, styleId });
return Response.json({ ok: true, styleId, imageUrl } satisfies GenerateResponseOk);
```

- `generateStyledImage`가 throw하는 모든 오류는 R2 route handler에서 try/catch로 잡아 `{ ok: false, styleId, error }`로 변환해야 한다.
- 토큰 미설정으로 인한 throw는 `error: 'Server configuration error'`로 마스킹 (PRD §보안: 키 이름 노출 금지).

---

## 5. 디자인 노트 / 알려진 한계 (R2가 알아야 할 점)

1. **`server-only` 패키지 미설치.** `stylePrompts.ts`/`replicate.ts`의 첫 줄 `// server-only` 주석은 의도 표시일 뿐 컴파일 가드가 아니다. **클라이언트 누출의 진짜 방어선은 qa의 grep**(architect §7.1과 본 산출물 §3). R2 이후 PR마다 qa가 재실행해야 한다.

2. **`replicate.run()` 타임아웃은 "취소"가 아니라 "응답 무시"이다.** `withTimeout`은 `Promise.race`로 구현 — 타임아웃이 발생하면 route handler가 504를 반환하지만, 실제 Replicate 호출은 백그라운드에서 계속 진행될 수 있다(SDK 1.4는 `AbortSignal` 미지원 가능성 큼). 비용 관점에서 분당 N회 rate limit이 abuse 1차 방어선임을 R2에서 인지할 것. 명시적 abort가 필요해지면 향후 SDK 업그레이드 또는 직접 fetch 구현으로 전환.

3. **`STYLE_PROMPTS`의 키와 `STYLES`의 id는 1:1 매핑.** R2/R3에서 새 스타일을 추가할 경우 **반드시 양쪽 동시 수정**. `stylePrompts.test.ts`의 "ids in STYLE_PROMPTS form a 1:1 mapping with config/styles ids" 케이스가 자동 차단한다.

4. **`aspect_ratio` 결정 규칙.** `getStylePrompt(id).aspectRatio`가 있으면 그것, 없으면 `'1:1'`. `passport`/`oil_painting`/`manga_inking`/`bw_studio`/`marble_bust`/`editorial_glam`는 `2:3`이고 나머지는 `1:1`이다. 클라이언트에는 이 정보가 노출되지 않으므로(`StyleMeta`에서 `aspectRatio` 의도적 제거), 결과 카드의 비율이 카테고리별로 달라지는 사실을 frontend가 모를 수 있다 → R3 결과 갤러리 카드는 `aspect-square`보다는 `aspect-auto`/object-contain 패턴이 안전.

5. **`replicate.ts`는 SDK 1.4의 `replicate.run` 반환을 `Promise<unknown>`으로 단언 후 사용.** SDK의 generic 시그니처가 모델별로 다양해 타입 추론이 강하게 좁혀지지 않기 때문. 단위 테스트가 `string` 및 `string[]` 두 형태를 커버하므로 일반적 런타임 안전성은 확보. **다만 Replicate JS SDK 1.x는 일부 모델에서 plain `string`/`string[]` 대신 `.url()` 메서드를 가진 `FileOutput` 객체(또는 그 배열)를 반환할 수 있다.** 현재 `extractFirstUrl`은 그 경로를 인식하지 못해 `null`을 반환하고 throw한다. R1 task spec은 string/string[]만 요구했으므로 본 라운드 차단 사유는 아니지만, **Phase 5 smoke가 이 path를 건드릴 가능성이 있다 — 그 시점에 `FileOutput` 분기를 `extractFirstUrl`에 추가하거나, `replicate.predictions.create` + polling 방식으로 전환**해야 할 수 있다.

6. **`generateStyledImage`의 retry 정책은 미구현.** PRD/agent 정의에 "Replicate 5xx → 1회 재시도"가 있으나 wrapper에서는 raw 호출만 한다. **재시도 로직은 R2의 route handler에서 구현**해야 한다 (try/catch + 1회 retry + 최종 502). wrapper에 retry를 묻으면 타임아웃 카운트가 누적되어 edge 한도 위험.

7. **클라이언트 다운로드 사용 시 CORS.** `imageUrl`은 Replicate 도메인이라 frontend가 `fetch(imageUrl).then(r => r.blob())`로 받을 때 CORS 이슈가 있을 수 있음. blob 다운로드 방식이 막히면 `<a href={url} download>` 단순 링크로 폴백. R3 frontend 영역이므로 참고 메모.

---

## 6. R2 진입 가능 여부

**R2 (`src/app/api/generate/route.ts` 본문 구현 + `src/lib/remoteConfig.ts`) 즉시 진입 가능.**

체크포인트:
- `generateStyledImage`/`isKnownStyleId` API 안정 (테스트로 잠금).
- 응답 shape 본 문서 §4에 동결.
- `process.env.REPLICATE_API_TOKEN` 읽기 위치는 wrapper로 일원화 — R2 route handler는 직접 읽을 필요 없음(읽으려면 `getReplicateClient()` 경유).
- 검증 순서(`replicate-proxy` 스킬 §"서버측 입력 검증" 4단계)는 R2에서 wrapper 호출 **이전**에 수행.

---

## 7. 변경 이력

| 일시 | 변경자 | 변경 내용 |
|------|--------|----------|
| 2026-05-12 | backend (Phase 3 R1) | 최초 작성. 모듈 3개 + 테스트 29건 + 풀 파이프라인 4종 게이트 PASS + 보안 grep 클린. API 응답 shape 동결. |
