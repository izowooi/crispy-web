# QA 기록

## 2026-07-11

### 최종 자동 검증

- `npm run typecheck`: 통과
- `npm run lint`: 통과
- `npm test`: 통과 — 5 files, 38 tests
- `npm run build`: 통과 — Next.js 16.2.10
- `npm run cloudflare:build`: 통과 — OpenNext Worker 생성, 민감 binding scrub, deploy artifact 검사
- `npm audit --audit-level=moderate`: 알려진 취약점 0건
- `pages:build`는 `cloudflare:build`의 모노레포 호환 alias이므로 별도로 중복 실행하지 않았다.

### Cloudflare Workers 로컬 HTTP 계약

비용이 발생하지 않는 validation 요청만 실행했다. 로컬 preview용 임시 접근 코드를 CLI binding으로 전달했고 실제 provider 요청은 보내지 않았다.

- `GET /`: 200
- `GET /api/access`: 200, `required=true`, `misconfigured=false`
- 12자 미만의 잘못된 운영 binding으로 별도 실행: `required=true`, `misconfigured=true` — production fail-closed 확인
- 접근 코드 없는 `POST /api/images`: 401 `ACCESS_CODE_REQUIRED`
- 접근 코드는 맞지만 multipart가 아닌 `POST /api/images`: 400 `FORM_DATA_REQUIRED`
- cross-site `POST /api/images`: 403 `CROSS_SITE_FORBIDDEN`
- `/cloudflare/next-env.mjs`, `/worker.js`: 각각 404
- 과거 `.pages-out`은 build 시작 시 전체 삭제되고 build 종료 검사에서도 존재하지 않음을 확인했다.
- `.open-next` 공개 assets에는 민감 환경 변수 key name이 없고, 전체 deploy artifact에는 현재 로컬 credential 값이 없음을 값 자체를 출력하지 않는 verifier로 확인했다.

### Live image smoke

사용자가 제공한 `example/forgotten-saga-ending.jpg`만 사용했다. 총 3개 이미지를 생성했으며 request ID와 provider 임시 URL은 기록하지 않는다.

- Next dev · OpenAI direct: `gpt-image-2`, Images edit, medium, 1장 → HTTP 200, WebP 반환
- Next dev · Replicate alternative: `black-forest-labs/flux-2-flex`, 1장 → HTTP 202, polling `succeeded`, WebP 반환
- 폐기 전 legacy local Pages assembly · OpenAI direct: medium, 1장 → local Worker 경유 WebP 반환
- 결과는 원본의 달, 두 인물, 돌담, 갑옷·검 구도를 유지하고 letterbox를 제거한 것을 사람이 확인했다.
- 비용이 큰 video live smoke는 실행하지 않았다. payload, 비용 확인 gate, 단일 prediction 계약은 단위 테스트로 검증했다.

### 보안 감사와 필수 후속 조치

초기 legacy `.pages-out` 조립 방식이 Worker server module을 정적 asset root에도 복사한다는 문제를 QA 중 발견했다. 이 local-only preview의 server env fallback module에 실제 provider credential이 포함됐고, 값이 도구 실행 trace에 한 번 노출됐다. 외부 배포나 공개 tunnel은 없었으며 값은 문서·응답·커밋에 재기록하지 않았다.

다음 조치를 완료했다.

- legacy Pages assembly와 관련 script를 폐기하고 공식 OpenNext Cloudflare Workers output으로 전환
- 모든 build 시작 시 `.pages-out` 전체 삭제
- OpenNext server env fallback에서 OpenAI, Replicate, 접근 코드 binding 제거
- 실제 로컬 credential 값이 deploy artifact에 남으면 build가 실패하는 검사 추가
- 운영 환경 접근 코드 fail-closed, same-origin 확인, request replay 방지, best-effort 이미지·영상 budget 추가
- server module 경로가 Workers preview에서 404임을 재확인

**운영 배포 전 OpenAI와 Replicate API key를 모두 회전해야 한다.** 회전한 새 값과 `CURRY_SHOT_ACCESS_CODE`만 Cloudflare runtime secret으로 등록하고, 기존 key를 폐기하기 전에는 배포하지 않는다.

### UI 브라우저 검증 상태

in-app Browser 연결이 앱 로드 전 도구 메타데이터 검증 단계에서 실패했다. 메인 작업과 별도 QA 에이전트에서 재확인했으며 `node_repl/js` 요청의 `sandboxPolicy` metadata 누락이 원인이었다. Browser 스킬 지침에 따라 standalone Playwright나 Computer Use로 우회하지 않았다.

대신 production HTML 생성, Tailwind responsive/dark variant, static sample asset 포함, overlay geometry와 canvas 저장 로직의 수치 일치, Next/OpenNext build를 확인했다. 실제 desktop/mobile viewport, light/dark toggle, upload·paste·sample interaction의 시각 QA는 Browser 연결 복구 후 다시 수행해야 한다.

### 2026-07-11 UI 간소화 재검증

- 첫 화면의 marketing hero와 요청된 보조 copy를 제거하고, 업로드 패널과 결과 미리보기가 즉시 보이는 compact layout으로 전환했다.
- light/dark palette를 warm brown에서 sky-blue gradient 기반 token으로 교체했다.
- `npm run typecheck`, `npm run lint`, `npm test` (38 tests), `npm run build`, `npm run cloudflare:build`를 다시 통과했다.
- local Next HTML에서 새 헤더 `리얼 프레임`과 `결과 미리보기`가 렌더되고, 제거 요청된 hero/label 문자열이 남지 않은 것을 확인했다.
- in-app Browser 연결은 동일한 metadata 오류로 재시도도 실패했다. Browser 스킬에 따라 대체 자동화 도구로 우회하지 않았으므로 actual viewport screenshot QA는 여전히 미검증이다.
