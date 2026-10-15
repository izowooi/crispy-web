# 호스팅: Cloudflare Workers + D1 (운영 기록)

> 최초 계획: 2026-10-14 · 배포 완료: 2026-10-14 · 주소: https://merge.zowoo.uk
> 따라 하며 배우는 설명은 [docs/learn/](learn/README.md)에 있고, 이 문서는 **결정과 운영 절차**만 남깁니다.

## 현재 구성

| 항목 | 값 |
|---|---|
| Worker | `infinite-merge` (OpenNext `@opennextjs/cloudflare` 1.20.11, Next 16.3.8) |
| 도메인 | `merge.zowoo.uk` (Workers Custom Domain) |
| DB | D1 `infinite-merge` (APAC), 테이블 `im_*`, binding `DB` |
| 플랜 | Workers **Free** |
| placement | `aws:ap-northeast-2` (HKG에서 Anthropic 403 회피) |
| secrets | `ANTHROPIC_API_KEY`, `IM_IP_SALT`, `TURNSTILE_SECRET_KEY` |
| 방어 | same-origin, Rate Limiting binding 2종, Turnstile(managed), D1 일일 쿼터 4종(게스트별 칸은 5분마다 충전) |
| 로컬 개발 | `npm run dev`는 원격 D1 공유, `dev:local`·`preview`는 로컬 사본 |

## 결정 기록

| 결정 | 이유 |
|---|---|
| Supabase가 아닌 **D1** | 원래 스키마가 SQLite라 거의 그대로 옮겨지고, Workers와 binding 한 줄로 연결된다. 무료 플랜이 비활성으로 정지되지 않고, Time Travel이 기본이다 |
| **Workers Free** 유지 | Worker 크기는 현재 비압축 64 MiB 기준이라 문제없다(5.7 MB / gzip 1.2 MB). CPU는 아래 "관찰할 위험" 참고 |
| 로컬 `npm run dev`가 **원격 D1 공유** | 로컬에서 ChatGPT 플랜으로 발견한 레시피가 호스팅 세계에도 쌓이게 하려고. 클론한 사람은 `dev:local`로 계정 없이 실행 |
| SIWC는 **로컬 전용으로 유지** | 호스팅이 플랜 사용량을 쓰려면 OpenAI 승인이 필요하다. 루프백이 아닌 호스트에서는 라우트를 404로 막고 UI를 숨긴다 |
| **Next 16.3.8 고정** | 16.4.0은 OpenNext 1.20.11에서 `preview-props.json` 오류로 부팅하지 못한다 ([#1448](https://github.com/opennextjs/opennextjs-cloudflare/issues/1448)). OpenNext가 고치면 올린다 |
| **`cacheComponents` 끔** | OpenNext에서 PPR 렌더가 응답 없이 멈춘다 ([#1225](https://github.com/opennextjs/opennextjs-cloudflare/issues/1225)). 이 앱은 `"use cache"`를 쓰지 않는다 |
| `/`와 `/icon.svg`를 **정적 asset으로 승격** | Next 서버를 거치면 `/` 하나에 CPU 18~119 ms가 들었다. asset이면 Worker가 실행되지 않는다 |
| 빌드 산출물 **secret scrub/verify** | OpenNext가 `.env.local` 값을 `next-env.mjs`에 적는다. 실제로 키가 들어간 것을 확인했다 |
| 원소 수는 **trigger 카운터** | `/api/state`마다 `COUNT(*)`를 하면 원소 수만큼 행을 읽는다(D1 Free는 하루 읽기 500만 행) |
| Turnstile은 **게스트 입장 때만** | 연성마다 확인하면 UX가 나빠진다. 입장 뒤는 Rate Limiting과 D1 쿼터가 맡는다 |
| 게스트 횟수 **충전은 지연 계산** | 타이머나 cron 없이, 연성할 때 같은 upsert 안에서 `refilled_at` 이후 지난 시간만큼 먼저 돌려준다. 쓰기 행이 늘지 않는다. 게스트별 칸만 충전되고 IP·전체 한도는 하루 상한 그대로다 |

## 게스트 한도 설정

대시보드(Workers → infinite-merge → Settings → Variables)에서 바로 바꿀 수 있습니다. 단, `npm run deploy`가 `wrangler.jsonc`의 `vars`로 덮어쓰므로 **대시보드에서 바꾼 값은 `wrangler.jsonc`에도 옮겨 적습니다.**

| 변수 | 현재 값 | 뜻 |
|---|---|---|
| `INFINITE_MERGE_GUEST_DAILY` | 600 | 게스트 한 명이 가질 수 있는 최대 횟수(충전 상한) |
| `INFINITE_MERGE_GUEST_REFILL_MINUTES` | 5 | 충전 간격(분). `0`이면 충전 끔 |
| `INFINITE_MERGE_GUEST_REFILL_AMOUNT` | 30 | 간격마다 돌려주는 횟수. `0`이면 충전 끔 |
| `INFINITE_MERGE_GUEST_IP_DAILY` | 1,500 | IP 하나의 하루 모델 호출 상한(충전 없음) |
| `INFINITE_MERGE_GUEST_GLOBAL_DAILY` | 15,000 | 모든 게스트 합계의 하루 상한. 운영자 크레딧의 최종 상한(충전 없음) |
| `INFINITE_MERGE_GUEST_JOIN_IP_DAILY` | 200 | IP 하나가 하루에 새로 만들 수 있는 게스트 수 |

모든 하루 한도는 00:00 KST에 초기화됩니다. 2026-10-15에 대시보드에서 앞의 4개 한도를 10배로 올렸고, 같은 날 충전을 추가했습니다(`migrations/0004_guest_refill.sql`).

## 미리 채운 레시피 (seed)

Claude(구독 세션의 Sonnet 서브에이전트)로 레시피를 미리 만들어 넣습니다. API 키는 쓰지 않습니다. 게스트가 이 조합을 만들면 AI를 부르지 않으므로 운영자 크레딧도 들지 않습니다.

| 회차 | 생성 | 결과 |
|---|---|---|
| 1회차 (2026-10-14) | 테마 15개 + 교차 6개, 약 33분 | 원소 30 → 10,247 |
| 2회차 (2026-10-15) | 세부 테마 156개 × 약 1,000줄(동시 20개), 약 2시간, 15.6만 줄 | 새 원소 119,083개, 레시피 135,159개. 하루 약 3만 개씩 4일에 나눠 넣음 |

2회차 반영 일정입니다. 파일은 로컬 전용(`.wrangler/seed/`, gitignore)이고, **반드시 순서대로** 적용해야 합니다. 뒤 파일이 앞 파일의 원소를 재료로 씁니다. 각 날짜 09:00 KST(00:00 UTC, Free 한도 초기화) 이후에 실행합니다.

| 날짜 | 파일 | 원소 | 쓰기 행 | 상태 |
|---|---|---|---|---|
| 10-15 | `day1-01.sql` | 29,786 | 61,786 | 적용 완료 (8초) |
| 10-16 | `day2.sql` | 29,391 | 61,791 | 대기 |
| 10-17 | `day3.sql` | 27,898 | 61,698 | 대기 |
| 10-18 | `day4a.sql` + `day4b.sql` | 32,008 | 68,967 | 대기 |

```bash
npx wrangler d1 info infinite-merge | grep rows_written   # 오늘 여유 확인 (24시간 이동 합계라 실제보다 크게 보일 수 있음)
npx wrangler d1 execute infinite-merge --remote --file .wrangler/seed/day2.sql -y
```

- **쓰기 비용:** migration 0003(WITHOUT ROWID) 이후 1행을 넣으면 쓰기 1행입니다. 그 전에는 TEXT 기본키 인덱스 때문에 2행이었습니다(운영에서 3행 → 6 vs 3으로 실측). Free 한도는 하루 10만 행이고, 한도를 넘기면 그날 00:00 UTC까지 플레이어의 쓰기도 실패합니다. 그래서 하루 약 6.2만 행으로 나누고 나머지는 플레이어 몫으로 남깁니다.
- **크기:** 원소 4만 개에서 7.41 MB였습니다(원소당 약 185 B). 13만 개면 약 24 MB, 500 MB의 약 5%로 예상합니다.
- **성능:** 브라우저 게스트 세션으로 20회씩 측정했습니다. 원소 1만 개 때는 `/api/state` p50 314 ms, 캐시 연성 p50 335 ms였습니다. 4만 개 때는 `/api/state` p50 268 / p90 367 ms, 캐시 연성 p50 388 / p90 449 ms입니다. 연성이 약 50 ms 늘었지만 표본이 작아 네트워크 편차와 구분되지 않습니다. 모든 조회가 기본키 조회라서 크기에 비례해 느려지지는 않을 것으로 봅니다. 4일 차(약 13만 개) 반영 뒤 같은 방법으로 다시 잴 예정입니다.
- **발견의 재미:** 시드 원소는 `first_by_sub = 'seed'`로 들어가 **아무도 발견하지 않은 상태**입니다. 처음 만든 플레이어가 "세계 최초 발견"을 가져가고, 그때부터 세계 원소 수에 더해집니다(`migrations/0002_seed_claim.sql`).
- **이모지:** 모두 실제 표준(RGI) 이모지이고, 확신이 없을 때는 ✨를 씁니다(대기 분량 기준 8.9만 개 중 466개).

### 다시 만들 때

1. `.wrangler/seed/`에 `scripts/seed/SPEC.md`(생성 규칙)와 `scripts/seed/check.py`(검증기)를 복사합니다.
2. `node scripts/seed-recipes.mjs --remote --out /tmp/x.sql --world-out .wrangler/seed/world <기존 jsonl…>`로 세계 이름·조합 목록(`world/names.txt`, `pairs.txt`)을 만듭니다.
3. 서브에이전트마다 세부 테마 하나, 재료 풀, 출력 파일 하나를 줍니다. 에이전트는 200줄마다 `check.py --fix`를 돌립니다.
4. `node scripts/seed-recipes.mjs --remote --out .wrangler/seed/day.sql --split 62000 .wrangler/seed/*.jsonl`로 하루 단위 파일을 만듭니다.

겪은 문제와 대응은 다음과 같습니다.
- **같은 이름 충돌:** 에이전트끼리 같은 이름을 만들면 새 원소가 아니라 대체 레시피가 됩니다. 중간에 `world/`를 갱신하면 줄어듭니다.
- **기계적 이름:** "카멜레온버스"처럼 두 재료를 그대로 붙인 이름과 "구아라나 아이스"처럼 재료 단어를 띄어 쓴 이름은 검증기와 import 도구가 버립니다(약 1.2만 줄). 1회차와 2회차 첫날 분량에는 일부 남아 있습니다.
- **공용 폴더 충돌:** 에이전트끼리 보조 스크립트(`add.py`)를 덮어써 줄이 섞였습니다. 보조 파일 이름에 출력 번호를 붙이게 했습니다.
- **실존 인물 실명:** 규칙으로 금지했지만 일부 섞여 에이전트가 직접 지웠습니다. 남은 것이 있을 수 있습니다.

## 배포 절차

```bash
npm test && npm run lint && npm run typecheck
npm run db:migrate:remote      # 스키마 변경이 있을 때만, 코드 배포보다 먼저
npm run deploy                 # cloudflare:build(승격·scrub·verify) → wrangler deploy
curl -s https://merge.zowoo.uk/api/state | head -c 300   # guest.available, siwc:false 확인
```

- **처음 배포하거나 키를 교체할 때:** `npx wrangler secret put ANTHROPIC_API_KEY`. 파이프 사용법은 [교재 3장](learn/03-secrets.md)을 보세요.
- **되돌리기:** `npx wrangler rollback`(직전 버전), DB는 `npx wrangler d1 time-travel restore`(DB 전체가 되돌아가므로 신중히).
- **로그:** `npx wrangler tail infinite-merge`, 대시보드 Workers → infinite-merge → Logs.

## 관찰할 위험

| 위험 | 지금 상태 | 지켜볼 곳 / 대응 |
|---|---|---|
| Free CPU 10 ms 초과 | API는 warm 상태 5~14 ms. 새 isolate가 뜰 때는 100~300 ms. 지금까지 실패 0건 | 대시보드 Metrics의 오류율. 1102 오류가 보이면 Workers Paid($5/월) |
| Rate Limiting binding이 느슨함 | 운영에서 순차 50회/17초는 통과, 병렬 200회 중 90회 차단 | 정확한 상한은 D1 쿼터가 맡는다. 필요하면 WAF 규칙 추가([교재 4-3](learn/04-defense.md)) |
| D1 하루 읽기/쓰기 행 | 시드를 넣는 날은 약 6.2만 행을 미리 씀. 평소 플레이는 수백 행 | `npx wrangler d1 info infinite-merge` |
| DB 용량 | 원소 4만 개에 7.41 MB(원소당 약 185 B). 시드 13만 개면 약 24 MB 예상 | `npx wrangler d1 info infinite-merge` |
| AI가 만든 부적절한 이름 | 필터 없음 | SQL로 수정([교재 1장 실습 5](learn/01-d1.md)) |

## 법·정책 메모 (확인 필요)

- **게임 등급분류:** 한국에서 공개 서비스하면 게임산업진흥법상 등급분류 대상이 될 수 있습니다. 무료·개인 제작일 때의 예외 범위는 게임물관리위원회 기준을 확인하세요.
- **개인정보:** IP는 소금을 섞은 해시로만 저장하지만 쿠키는 씁니다. 간단한 처리방침 페이지를 검토하세요.
- **Anthropic 이용 정책:** 공개 서비스에서 생긴 문제는 운영자 책임입니다.
