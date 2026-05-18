# volley-ball — Pikachu Volleyball Port

이 프로젝트는 [gorisanson/pikachu-volleyball](https://github.com/gorisanson/pikachu-volleyball)의 게임 코어를 외부 chrome 없이 캔버스만 표시하도록 이식한 버전이다. 최종 목적은 그래픽 자산을 다른 이미지 세트로 교체하는 것.

## 하네스: Pikachu Volley 이식 + 자산 교체

**목표:** 상류 게임을 이식·유지보수하고, 사용자가 동일 해상도의 새 이미지 세트로 리소스를 교체할 수 있도록 명세와 통합 워크플로우를 제공한다.

**트리거:** 게임 이식, chrome 제거/추가, 자산 명세 갱신, QA 재실행, 리소스 교체 관련 작업 요청 시 `pikachu-volley-orchestrator` 스킬을 사용하라. 단순 빌드/실행 명령(`npm start`)은 직접 응답 가능.

**상류 저장소:** `/Users/izowooi/git/pikachu-volleyball/`

**참고 문서:**
- 자산 교체 명세: `ASSET_REPLACEMENT_SPEC.md` (있는 경우)
- QA 보고서: `_workspace/qa_report.md` (있는 경우)

**변경 이력:**

| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-05-18 | 초기 구성 | 전체 (`.claude/agents/`, `.claude/skills/`, CLAUDE.md) | 게임 이식 + 자산 교체 워크플로우 자동화 |
