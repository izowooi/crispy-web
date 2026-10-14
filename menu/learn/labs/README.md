# 실습 모음 (labs)

각 장의 "직접 해보기"에서 쓰는 코드·SQL·안내서입니다. 저장소 루트가 아니라 **`menu/` 폴더에서** 명령을 실행하세요(`cd menu`).

## 안전 등급

| 표시 | 뜻 |
|---|---|
| 🟢 로컬 전용 | 내 컴퓨터 안에서만 동작합니다. 운영 데이터·비용에 영향이 없습니다 |
| 🟡 읽기 전용 | 운영·외부 서비스를 **조회만** 합니다 |
| ⚠️ 비용/운영 영향 | 실행하면 API 비용이 들거나 운영 데이터를 바꿀 수 있습니다. 기본은 실행하지 않습니다 |

## 실습 목록

| 장 | 실습 | 등급 | 실행 | 걸리는 시간 |
|---|---|---|---|---|
| [01](../01-cloudflare-workers.md) | 입구 데이터센터 확인 | 🟡 | `bash learn/labs/cloudflare/trace-colo.sh` | 3분 |
| [01](../01-cloudflare-workers.md) | 연습용 Worker 로컬 실행 | 🟢 | [`cloudflare/local-worker-hello/`](cloudflare/local-worker-hello/README.md) | 15분 |
| [01](../01-cloudflare-workers.md) | wrangler 명령 치트시트 | — | [`cloudflare/wrangler-cheatsheet.md`](cloudflare/wrangler-cheatsheet.md) | 참고용 |
| [01](../01-cloudflare-workers.md) | 실행 위치(placement) 실험 안내 | — | [`cloudflare/placement-experiment.md`](cloudflare/placement-experiment.md) | 읽기 10분 |
| [10](../10-ops-runbook.md) | 관리 비밀번호 바꾸는 SQL 만들기 | 🟢 만들기 / ⚠️ 적용 | [`cloudflare/set-pin.mjs`](cloudflare/set-pin.mjs) | 10분 |
| [03](../03-d1-sql.md) | D1 연습장 (UPSERT·COALESCE·JSON·인덱스) | 🟢 | `npx wrangler d1 execute baby-menu --local --file learn/labs/data/d1-playground.sql` | 20분 |
| [03](../03-d1-sql.md) | 외래키 성공과 실패 | 🟢 | [`data/d1-playground.md`](data/d1-playground.md) 참고 | 10분 |
| [04](../04-r2-storage.md) | 사진 키 규칙과 보관 만료 계산 | 🟢 | `node learn/labs/data/r2-key-lab.mjs` | 10분 |
| [05](../05-nextjs-app-router.md) | 서버 액션에 로그 넣어 보기 | 🟢 | [`nextjs/server-action-lab.md`](nextjs/server-action-lab.md) | 20분 |
| [06](../06-claude-structured-output.md) | Zod 스키마와 Claude 출력 형식 | 🟢 | `node learn/labs/claude/schema-lab.mjs` | 10분 |
| [06](../06-claude-structured-output.md) | 실제 사진으로 분석 시험 | ⚠️ API 비용 | [`claude/prompt-lab.md`](claude/prompt-lab.md) | 15분 |
| [07](../07-auth-cookies.md) | PBKDF2 해시·반복 횟수·토큰 | 🟢 | `node learn/labs/auth/pbkdf2-lab.mjs` | 10분 |
| [08](../08-dates-kst.md) | UTC와 KST의 하루 차이 | 🟢 | `node learn/labs/dates/kst-lab.mjs` | 10분 |
| [09](../09-pwa.md) | 서비스 워커 캐시 전략 비교 | 🟢 | `node learn/labs/pwa/server.mjs` → <http://localhost:5173> | 15분 |

## 처음 한 번 준비

```bash
cd menu
npm install
npm run db:migrate:local      # 로컬 D1에 테이블 만들기 (D1 실습에 필요)
```

## 지켜야 할 것

- 실습용 Worker 이름은 `baby-menu-lab-…`입니다. 운영 `baby-menu`와 이름이 다르므로 실습 때문에 운영이 바뀌지 않습니다. 실습 Worker는 `wrangler dev`(로컬)로만 돌리고 **deploy하지 않습니다**.
- D1 실습의 SQL은 `lab_`로 시작하는 연습용 테이블만 만들고 지웁니다. 앱의 진짜 테이블은 건드리지 않습니다.
- `--remote`가 붙은 명령은 운영을 건드립니다. 실습에서는 쓰지 않습니다(운영 조회는 10장에서 ⚠️로 표시해 따로 안내).
- 관리 비밀번호, API 키 값은 어디에도 적지 않습니다. 실습 코드는 `demo-1234` 같은 가짜 값만 씁니다.

← [학습 자료 처음으로](../README.md)
