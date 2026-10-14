# 호스팅 계획: Cloudflare Workers + D1

> 작성일: 2026-10-14
> 전제: Sign in with ChatGPT(SIWC)는 원격 호스팅 승인이 없다고 보고 **제외**한다. 웹에서는 Claude Haiku 게스트 모드만 운영한다.

## 결론

**Cloudflare Workers + D1**을 권장한다. 다만 선택 이유는 DB 리전이 아니라 **SQLite 호환**과 **같은 플랫폼 안에서 바인딩으로 바로 연결된다는 점**이다.

## 리전이 생각보다 중요하지 않은 이유

- **병목은 AI 호출이다.** 실측으로 Haiku 연성 1회에 1.6~2.6초가 걸렸다. 연성 한 번에 DB 왕복은 몇 번뿐이라, DB가 서울에 있든 도쿄·싱가포르 근처에 있든 차이는 수십 ms다.
- **캐시된 조합도 마찬가지다.** 이미 발견된 조합은 AI 없이 DB만 읽는다. 그래도 수십~100ms 수준이라 연성 애니메이션에 묻힌다.
- **D1 위치:** `apac` 위치 힌트를 줄 수 있지만 서울이라는 보장은 없다. 읽기 복제를 켜면 사용자 가까운 곳에 읽기 사본이 생기고, 추가 요금은 없다.

## D1과 Supabase 비교

| | Cloudflare D1 | Supabase |
|---|---|---|
| 지금 코드와 맞는 정도 | **SQLite 그대로.** 스키마를 거의 그대로 옮길 수 있음 | Postgres라 SQL 문법과 스키마 수정 필요 |
| Workers와의 연결 | 바인딩 한 줄. 연결 관리 불필요 | Hyperdrive(연결 풀)를 쓰거나 HTTP API(supabase-js) 경유 |
| 무료 플랜 | 일시정지 없음 | **1주일 접속이 없으면 프로젝트 정지**, 직접 재개해야 함. 프로젝트당 DB 500MB |
| 유료 | Workers Paid $5/월에 포함되는 양이 넉넉함 | Pro $25/월부터 |
| 백업 | Time Travel(특정 시점 복구) 기본 제공 | 무료 플랜은 사실상 없음 |
| Supabase만의 강점 | — | 인증, 실시간, 스토리지, Postgres의 풍부한 기능 |

Supabase의 가장 큰 가치는 인증이다. 인증이 없는 지금은 그 장점이 사라진다. 다음이 필요해지면 Supabase를 다시 검토한다.

- 구글·카카오 로그인
- 실시간 리더보드
- 복잡한 통계 쿼리

## 호스팅 비교

- **Cloudflare Workers (권장)**
  - AI 응답을 기다리는 시간은 CPU 시간으로 계산되지 않아, 이 앱처럼 대기가 긴 경우 비용 효율이 좋다.
  - Next.js를 올리려면 OpenNext 어댑터(`@opennextjs/cloudflare`)가 필요하다.
  - 무료 플랜은 요청당 CPU 10ms, 번들 3MB 제한이 있어 Next.js 앱이 넘기 쉽다. **Workers Paid($5/월)를 전제**로 잡는다.
  - ⚠️ 현재 켜 둔 `cacheComponents`를 OpenNext가 지원하는지 확인하지 못했다. **가장 먼저 시험할 항목이다.** 문제가 되면 이 옵션을 끈다.
- **Vercel**
  - Next.js를 가장 쉽게 올릴 수 있고 서울 리전이 있다.
  - Hobby 플랜은 비상업용으로만 쓸 수 있다.
  - DB는 어차피 따로 붙여야 한다(서버리스 환경이라 `node:sqlite` 파일을 둘 곳이 없다).
- **VM·컨테이너 1대 (Fly.io, Railway 등)**
  - 지금의 `node:sqlite` 파일을 거의 그대로 쓸 수 있어 가장 빨리 띄울 수 있다.
  - 백업과 확장은 직접 챙겨야 한다.

## Workers + D1로 옮길 때 바꿔야 할 코드

- [ ] **OpenNext 적용**
  - `@opennextjs/cloudflare`와 `wrangler.jsonc`를 추가한다.
  - `cacheComponents` 호환 여부를 확인한다.
- [ ] **DB 계층** (`lib/server/db.ts` 및 호출부 약 29곳)
  - `node:sqlite`의 동기 호출(`DatabaseSync`)을 D1 비동기 호출로 바꾼다.
  - D1은 BEGIN/COMMIT 방식의 트랜잭션을 지원하지 않는다. 지금의 `transaction()` 헬퍼는 `batch()`로 대체한다.
  - 게스트 횟수 차감(`lib/server/guest/quota.ts`)은 쿼리 한 번으로 원자적으로 처리한다. 예: `UPDATE … SET count = count + 1 WHERE … AND count < ? RETURNING count`
  - 스키마는 `wrangler d1 migrations` 파일로 옮긴다.
- [ ] **SIWC 제거**
  - 대상: `app/auth/chatgpt`, `app/auth/callback`, `lib/server/siwc/*`, `.data/credentials` 파일 저장, ChatGPT 버튼과 업그레이드 UI
  - 로컬 실험용으로 남기려면 환경변수 플래그로 분기한다.
- [ ] **로컬 전용 가정 제거**
  - `lib/server/http.ts`의 `127.0.0.1` 하드코딩을 실제 도메인으로 바꾼다.
  - `lib/server/session.ts`의 세션 쿠키를 `secure: true`로 바꾼다.
  - Origin 검사를 실제 도메인 기준으로 바꾼다.
  - Landing의 "로컬 실행 전용" 안내 문구를 바꾼다.
- [ ] **시크릿:** `wrangler secret put ANTHROPIC_API_KEY`로 넣는다. Anthropic 콘솔에서 이 서비스 전용 키를 새로 만든다.

## 호스팅·DB 말고 고려할 것

### 1. 크레딧 남용 방지 (최우선)

SIWC가 없으면 모든 AI 비용이 운영자 크레딧에서 나간다. 게다가 지금 게스트 한도는 쿠키를 지우면 초기화된다.

- 게스트 입장에 **Cloudflare Turnstile**(무료 봇 차단)을 붙인다.
- **IP별 요청 제한**을 건다. Workers Rate Limiting 바인딩이나 WAF 규칙으로 할 수 있다.
- Anthropic 콘솔에서 **워크스페이스 지출 한도**를 건다. 코드에 버그가 있어도 지출이 여기서 멈춘다.
- 이미 있는 장치:
  - 전체 일일 한도: `INFINITE_MERGE_GUEST_GLOBAL_DAILY`, 기본 1,500회
  - 1인당 한도: `INFINITE_MERGE_GUEST_DAILY`, 기본 60회
  - 끄기 스위치: `INFINITE_MERGE_GUEST=off`

### 2. 공유 세계의 동시성과 콘텐츠

- 여러 사람이 같은 새 조합을 동시에 해도 레시피가 하나만 남아야 한다. 유니크 키와 `INSERT OR IGNORE`로 처리한다.
- AI가 만든 이름은 모든 플레이어에게 공유된다. 금칙어 필터와, 레시피를 고치거나 지울 수 있는 관리 기능이 필요하다.
- 입력은 이미 있는 원소 이름뿐이라 프롬프트 인젝션 위험은 낮다.

### 3. 진행 기록 보존

로그인이 없으면 기록이 쿠키 하나에 묶인다. 쿠키를 지우거나 기기를 바꾸면 기록이 사라진다. 처음에는 "복구 코드"(내보내기·가져오기)로 대응하고, 나중에 소셜 로그인을 검토한다.

### 4. 법·정책 (확인 필요)

- **게임 등급분류:** 한국에서 공개 서비스하면 게임산업진흥법상 등급분류 대상이 될 수 있다. 무료·개인 제작일 때의 예외 범위는 게임물관리위원회 기준을 확인한다.
- **개인정보처리방침:** 익명이라도 IP와 쿠키를 처리하므로 간단한 방침 페이지를 둔다.
- **Anthropic 이용 정책:** 공개 서비스에서 생기는 문제는 운영자 책임이다.

### 5. 운영

- 로그: Workers Logs
- 백업: D1 Time Travel
- 스키마 변경: `wrangler d1 migrations`
- 스테이징 환경과 커스텀 도메인
- 비용 추적: 서버 로그의 `[guest] claude ok … in=… out=… request_id=…`

### 6. 비용 모델

- 실측: 1회 연성에 입력 1,306토큰, 출력 50토큰.
- Haiku 5.5 단가(입력 $0.10, 출력 $0.50 / 100만 토큰) 기준 1회 약 **$0.00016**.
  - 하루 1,500회 ≈ $0.23
  - 하루 1만 회 ≈ $1.6
- AI 비용 자체보다 **남용 방지**가 훨씬 중요하다.
- 많이 하는 사용자를 위해 본인 API 키를 넣는 옵션(BYOK)을 둘 수 있다.

## 이어서 작업할 때 (압축 해제 후)

```bash
npm install
cp .env.example .env.local   # ANTHROPIC_API_KEY=sk-ant-... ("=" 하나, 따옴표 없이)
npm run dev                  # http://127.0.0.1:3000
npm test                     # vitest 64개
npm run dev:mock             # AI 없이 가짜 연성으로 UI 확인
```

- `npx tsc --noEmit`은 `npm run dev`나 `npm run build`를 한 번 실행한 뒤에 돌린다. Next가 `LayoutProps` 같은 타입을 그때 생성하기 때문이다.
- 압축에는 다음이 **빠져 있다**: `node_modules`, `.next`, `.env.local`(키), `.data/`(로컬 DB와 SIWC 토큰). 게임 진행 기록은 새로 시작된다.
- 프로젝트 규칙은 `AGENTS.md`, 설정·검증 기록은 `README.md`에 있다.
- 다음 작업 후보(순서대로):
  1. OpenNext 시험 배포로 `cacheComponents` 호환 확인
  2. D1 비동기 DB 계층으로 이전
  3. SIWC 제거
  4. Turnstile과 IP 요청 제한 추가

## 참고 자료

- [Cloudflare D1 – Data location](https://developers.cloudflare.com/d1/configuration/data-location/)
- [Cloudflare D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)
- [Supabase pricing](https://supabase.com/pricing)
- [Supabase Free Plan limits 2026 (3rd party)](https://automationatlas.io/answers/supabase-free-tier-limits-2026/)
- [Next.js 16](https://nextjs.org/blog/next-16)
- [OpenNext for Cloudflare](https://opennext.js.org/cloudflare)
