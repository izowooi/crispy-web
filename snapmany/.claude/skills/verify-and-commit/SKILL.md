---
name: verify-and-commit
description: 풀 파이프라인 게이트(typecheck/lint/test/build) + 시크릿 grep + 모노레포 안전 커밋·푸시를 한 묶음으로 실행. snapmany의 어떤 변경이든 작업이 완료되어 사용자에게 보고하기 직전에 반드시 트리거한다. "커밋", "푸시", "deploy 직전", "작업 마무리", "검증하고 올려", "PR 준비" 같은 키워드/맥락에서 이 스킬을 사용한다. 사용자가 명시적으로 "커밋 금지"라 하지 않는 한, 작업 종료 시 자동 실행이 기본이다 (사용자 글로벌 CLAUDE.md 규칙).
---

# Verify and Commit

snapmany의 작업이 끝났다고 선언하기 전에 이 절차를 통과해야 한다. 통과 후 커밋 + 푸시까지 자동으로 수행한다 (사용자 글로벌 CLAUDE.md 규칙).

## 절차

### 1. 풀 파이프라인 게이트

순서대로 4개 모두 0 에러로 통과해야 한다. 하나라도 실패하면 커밋하지 않는다.

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

`npm run pages:build`까지 통과시키면 더 안전 (Cloudflare 배포 시점에서 깨질 위험 사전 차단).

### 2. 시크릿 grep (필수)

스테이징 직전, 변경된 파일 목록에 다음 패턴이 있으면 차단:

```bash
git status --short
# 변경 파일 중에 .env, .env.local, .env.production, *.key, *.pem 가 있는지 확인
git diff --cached --name-only | grep -E '\.(env|key|pem)$|credentials' && echo "BLOCKED: sensitive file staged"
```

스테이징된 내용에 하드코딩된 토큰이 있는지:
```bash
git diff --cached | grep -E 'r8_[A-Za-z0-9]{20,}' && echo "BLOCKED: Replicate token in diff"
git diff --cached | grep -E 'AIza[A-Za-z0-9_-]{30,}' && echo "BLOCKED: Firebase API key in diff"
git diff --cached | grep -E '(sk-|sk_live_|sk_test_)[A-Za-z0-9]{20,}' && echo "BLOCKED: OpenAI/Stripe-like secret in diff"
```

하나라도 매칭되면 즉시 중단, 사용자에게 알린다.

### 3. 모노레포 원격지 확인

사용자는 모노레포로 관리한다. push 전에 원격이 사용자의 것인지 확인:

```bash
git remote -v
```

원격이 비어 있거나, 사용자의 모노레포(`crispy-web` 관련)가 아니면 push하지 않고 사용자에게 확인.

### 4. 스테이징 (특정 파일만)

`git add .` 또는 `git add -A`는 사용하지 않는다. 의도한 파일만 명시적으로 추가:

```bash
# 예: snapmany 디렉토리 안의 변경만
git add snapmany/.claude snapmany/src snapmany/package.json snapmany/package-lock.json \
        snapmany/next.config.ts snapmany/tsconfig.json snapmany/postcss.config.mjs \
        snapmany/wrangler.jsonc snapmany/.gitignore snapmany/.env.example \
        snapmany/eslint.config.mjs snapmany/README.md
```

`snapmany/.env.local` 같은 파일이 함께 잡히지 않는지 grep으로 한 번 더 확인.

### 5. 커밋

커밋 메시지는 한국어로 간결하게, 변경 의도를 담아 작성한다 (사용자 commit 스타일 기준 — 최근 커밋 참조: "mojipop: GPT Image 2 기반 AI 이모티콘 생성기 초기 구현").

```bash
git commit -m "$(cat <<'EOF'
snapmany: <변경 의도 한 줄>

<상세 1~3줄, 필요 시>
EOF
)"
```

`--no-verify` 절대 금지. pre-commit hook이 실패하면 원인을 고친 뒤 새 커밋을 만든다 (amend X — 사용자 글로벌 규칙).

### 6. 푸시

```bash
git push
```

force push 금지. 새 브랜치 생성 금지 (사용자 글로벌: 모노레포 main에 직접 푸시).

## 안티패턴

- 파이프라인을 한 명령만 부분 실행하고 "통과했다" 선언 (4개 모두 필수)
- `git add .` 또는 `git add -A` (의도치 않은 파일 포함 위험)
- `--no-verify`로 hook 우회
- `--amend`로 이전 커밋 덮어쓰기
- 새 브랜치/저장소 생성

## 실패 시 행동

| 실패 단계 | 다음 행동 |
|---------|---------|
| typecheck 실패 | 에러를 보고 코드 수정. 재시도. |
| lint 실패 | 자동 fix(`npm run lint -- --fix`) 시도, 안 되면 수동 수정. |
| test 실패 | 어떤 테스트가 실패했는지 메시지로 보고. 구현 또는 테스트 중 어느 쪽이 잘못된지 판단 후 수정. |
| build 실패 | edge runtime export 누락, node-only API 사용 등 흔한 원인 점검. nextjs-cloudflare-edge 스킬 참조. |
| 시크릿 매칭 | **즉시 중단**. 사용자에게 알리고 어떤 파일·어떤 라인인지 보고. 절대 임의로 커밋하지 않는다. |
| remote 미확인 | 사용자에게 원격 주소 확인 요청. push 대기. |

## 사용자 commit 메시지 컨벤션 (관찰된 패턴)

최근 커밋:
- `mojipop: 품질 선택 UI 비활성화, low 고정`
- `mojipop: 접근 암호 게이트 추가`
- `ductcanvas: 푸터 소스 코드 링크 텍스트 간결하게 수정`

패턴: `<프로젝트명>: <변경 의도 짧게 한국어>`. snapmany 커밋은 `snapmany: ...`로 시작.
