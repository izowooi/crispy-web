# AGENTS.md — volley-ball (Layer 3)

이 문서는 `volley-ball` 프로젝트에 적용되는 Layer 3 작업 지침이다.
상위 Layer 2 지침은 `../AGENTS.md`를 따른다.

## 프로젝트 개요

`gorisanson/pikachu-volleyball`의 게임 core를 외부 chrome 없이 canvas만 표시하도록 이식한 웹게임이다. 게임 동작을 유지하면서 그래픽 자산을 동일 규격의 다른 이미지 세트로 교체할 수 있게 하는 것이 목적이다.

## 하네스

게임 이식, chrome 변경, asset 명세 갱신, QA, resource 교체 작업에는 `.claude/skills/pikachu-volley-orchestrator/SKILL.md`가 존재하면 그 워크플로우를 적용한다. 단순 실행 명령은 직접 처리할 수 있다.

## 상류와 참조 문서

- 상류 로컬 저장소: `$HOME/git/pikachu-volleyball/`.
- `ASSET_REPLACEMENT_SPEC.md`: asset 교체 명세.
- `_workspace/qa_report.md`: QA 보고서가 존재할 때 참조.
- `assets_src/`: 교체 가능한 개별 PNG 자산.

## 실행과 검증

```bash
npm start
npm test
npm run build
```

sprite round-trip 작업에는 다음 명령을 사용한다.

```bash
npm run extract:sprites
npm run pack:sprites
```

- asset 변경 후 `npm test`로 분해·합성 round-trip을 검증한다.
- 새 asset은 기존 해상도와 배치를 유지한다.
- `npm run pack:sprites`가 생성하는 통합 sprite와 runtime 경로를 함께 확인한다.

## 주의사항

- 상류 저장소는 참고용이며 사용자 요청 없이 수정하거나 동기화하지 않는다.
- generated sprite를 직접 편집하지 않고 `assets_src/`와 pack script를 단일 변경 경로로 사용한다.
- gameplay core 변경과 asset-only 변경을 구분하고, gameplay 변경에는 별도 회귀 검증을 추가한다.
