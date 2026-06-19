# AGENTS.md — snapmany (Layer 3)

이 문서는 `snapmany` 프로젝트에 적용되는 Layer 3 작업 지침이다.
상위 Layer 2 지침은 `../AGENTS.md`를 따른다.

## 프로젝트 개요

사진 한 장을 캐리커처, 3D, 증명사진 등 여러 스타일로 동시에 변환하는 Next.js 16 + Cloudflare Pages 앱이다. Replicate image model의 얇은 server proxy와 Firebase Remote Config를 사용하며 DB·계정·결제는 없다.

## 하네스

snapmany 기능·UI·API 변경, 테스트, 배포 준비 작업에는 `.claude/skills/snapmany-builder/SKILL.md`의 워크플로우를 적용한다. 단순 질의는 직접 처리할 수 있다.

## 핵심 제약

1. 코드 변경은 RED → GREEN → REFACTOR 순서로 진행한다.
2. 완료 전 아래 검증을 모두 통과시킨다.

   ```bash
   npm run typecheck
   npm run lint
   npm run test
   npm run build
   ```

3. `src/app/api/**/route.ts`에는 `export const runtime = "edge";` 선언을 유지한다.
4. `REPLICATE_API_TOKEN`은 server에서만 사용하고 `NEXT_PUBLIC_REPLICATE_*` 형태로 노출하지 않는다.
5. 설계 결정은 `_workspace/00_architect_decisions.md`를 단일 진실 소스로 사용한다.

## 주요 참조

- `docs/prd.md`: 제품 요구사항.
- `.claude/skills/tdd-workflow/SKILL.md`: TDD 절차.
- `.claude/skills/verify-and-commit/SKILL.md`: 검증과 커밋 절차.
- `.claude/skills/replicate-proxy/SKILL.md`: Replicate server proxy 규칙.
- `.claude/skills/firebase-remote-config/SKILL.md`: Remote Config 규칙.

## 배포

Cloudflare Pages 변환 검증에는 `npm run pages:build`를 사용하고, 실제 배포나 비용이 발생하는 live 생성 호출은 사용자 요청 또는 승인 없이 실행하지 않는다.
