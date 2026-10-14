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
| 방어 | same-origin, Rate Limiting binding 2종, Turnstile(managed), D1 일일 쿼터 4종 |
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
| D1 하루 읽기/쓰기 행 | 원소 30개 기준 24시간 동안 읽기 1,676행, 쓰기 330행 | `npx wrangler d1 info infinite-merge` |
| DB 용량 | 102 kB. 원소 1개에 약 1.1 KB → 500 MB에 약 45만 개 | `npm run lab:size` |
| AI가 만든 부적절한 이름 | 필터 없음 | SQL로 수정([교재 1장 실습 5](learn/01-d1.md)) |

## 법·정책 메모 (확인 필요)

- **게임 등급분류:** 한국에서 공개 서비스하면 게임산업진흥법상 등급분류 대상이 될 수 있습니다. 무료·개인 제작일 때의 예외 범위는 게임물관리위원회 기준을 확인하세요.
- **개인정보:** IP는 소금을 섞은 해시로만 저장하지만 쿠키는 씁니다. 간단한 처리방침 페이지를 검토하세요.
- **Anthropic 이용 정책:** 공개 서비스에서 생긴 문제는 운영자 책임입니다.
