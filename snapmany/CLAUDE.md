# snapmany

사진 한 장을 다양한 스타일(캐리커처, 3D, 증명사진 등 10종)로 동시에 변환하는 Next.js 16 + Cloudflare Pages MVP. Replicate(gpt-image-2) 얇은 프록시, Firebase Remote Config, DB·계정·결제 없음.

## 하네스: snapmany 도메인 빌드/유지보수

**목표:** PRD(`docs/prd.md`)에 명시된 MVP를 TDD로 안전하게 빌드하고, 이후 스타일·UI·API 확장도 동일 절차로 수행한다.

**트리거:** snapmany 도메인 작업 요청(빌드, 스타일/UI/API 변경, 테스트 추가, 배포 준비, 재실행/부분 수정 등) 시 `snapmany-builder` 스킬을 사용하라. 단순 질문(예: "이 파일이 뭐 하는 거야?")은 직접 응답 가능.

**원칙:**
1. **TDD 강제** — 모든 코드 변경은 RED → GREEN → REFACTOR(풀 파이프라인 게이트) 사이클을 거친다. `tdd-workflow` 스킬이 절차를 강제한다.
2. **풀 파이프라인 게이트** — 작업 마무리 전 `npm run typecheck && npm run lint && npm run test && npm run build` 4개 모두 0 에러 통과 필수. `verify-and-commit` 스킬이 게이트 + 커밋·푸시를 묶어서 실행한다.
3. **edge runtime 양보 불가** — `src/app/api/**/route.ts`에 `export const runtime = 'edge';` 누락 금지.
4. **토큰 보호 양보 불가** — `REPLICATE_API_TOKEN`은 서버에서만. `NEXT_PUBLIC_REPLICATE_*` 절대 금지.
5. **결정은 한 곳에** — `_workspace/00_architect_decisions.md`가 단일 진실 소스. 모든 에이전트는 첫 행동으로 이 파일을 읽는다.

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|---------|------|------|
| 2026-05-11 | 초기 하네스 구성 (4-에이전트 하이브리드: architect/frontend/backend/qa + 5개 스킬 + 오케스트레이터) | 전체 | snapmany MVP 빌드 및 향후 확장 자동화 |
| 2026-05-11 | 빌드 결정사항(D1~D4) + incremental 커밋 정책 반영 | architect.md / snapmany-builder | 사용자 확정: Vitest+Playwright MCP, 7카테고리 ~15스타일, 수동 대시보드 배포, Firebase MCP 자동 생성 |
| 2026-05-12 | 첫 화면 진입 암호 게이트 추가 (PasswordGate + AuthGate + /api/auth) | src/components, src/app/api/auth, layout.tsx | ductcanvas 패턴 흡수. ACCESS_PASSWORD env 필수. |
