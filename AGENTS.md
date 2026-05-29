# AGENTS.md

이 문서는 `crispy-web` 모노레포의 Layer 2 작업 지침입니다.
상위 Layer 1 전역 지침은 `$HOME/git/AGENTS.md`를 따르며, 하위 폴더에 더 구체적인 `AGENTS.md`가 있으면 그 지침을 우선합니다.

이 저장소는 여러 개의 독립 웹앱을 한 곳에서 관리하는 모노레포입니다. 대부분의 앱은 Next.js App Router, TypeScript, Tailwind CSS를 기반으로 하고, Cloudflare Pages/Workers, R2, Supabase, Replicate, Firebase Remote Config, Google OAuth 같은 외부 서비스를 앱별로 조합합니다.

이 문서는 저장소 루트의 공통 작업 지침입니다. 하위 폴더에 별도의 `AGENTS.md`, README, docs, `.codex/skills`가 있으면 해당 앱에서는 더 구체적인 하위 지침을 우선합니다.

## 저장소 구조

- 각 상위 폴더는 대체로 독립 앱 또는 도메인입니다. 예: `snapmany`, `gen-nai/web`, `ductcanvas`, `mojipop`, `seedance-studio`, `awesome-cut`, `clipplay`, `podplay`, `photokeep`, `gen-password`, `hero-showcase`, `landing`, `qrcode`, `place-keep/my-places`, `mama/toprest`.
- 루트에 공통 `package.json`이나 통합 workspace 스크립트가 없습니다. 작업 전 반드시 대상 앱 디렉터리로 이동해서 그 앱의 `package.json` 스크립트를 사용합니다.
- 각 앱은 자체 `package-lock.json`을 가지고 있으므로 기본 패키지 매니저는 `npm`입니다. 다른 lockfile이 있는 앱이 아니라면 `npm install`, `npm run ...`을 사용합니다.
- `.next`, `out`, `.vercel`, `.wrangler`, `.pages-out`, 로그, 로컬 worktree, `.playwright-mcp` 등 생성물은 작업 맥락 확인 외에는 수정 대상으로 보지 않습니다.
- 숨김 폴더의 `.Codex/`, `docs/`, `_workspace/`에는 기획, 테스트 기록, 하네스, 운영 결정사항이 들어있는 경우가 많습니다. 구현 전 관련 문서를 먼저 읽습니다.

## 주요 앱 성격

- AI 이미지/영상 생성 또는 편집 앱: `snapmany`, `ductcanvas`, `mojipop`, `seedance-studio`, `awesome-cut`, `redraw`, `imgblend`, `gen-nai/web`.
- 가족/개인 미디어 앱: `photokeep`, `clipplay`, `podplay`.
- 유틸리티/정적 앱: `gen-password`, `colorpick`, `qrcode`, `nonogram`, `landing`.
- Supabase/장소/관리형 앱: `hero-showcase`, `place-keep/my-places`, `mama/toprest`, `employparty`.
- 데이터 수집/워커: `gen-nai/char-collector`, `gen-nai/queue-worker`, `qrcode/workers/r2-uploader`, `cooklink`.

## 기본 작업 방식

1. 먼저 대상 앱을 특정합니다. 사용자가 앱 이름을 말하지 않으면 변경 파일, README, 최근 커밋, 요청 도메인으로 추론하고, 위험하면 짧게 확인합니다.
2. 대상 앱의 `README.md`, `README_EN.md`, `AGENTS.md`, `docs/`, `package.json`을 읽고 로컬 규칙을 파악합니다.
3. 기존 구조와 컴포넌트 패턴을 따릅니다. 불필요한 공통화, 대규모 리팩터링, 앱 간 코드 이동은 피합니다.
4. TDD를 선호합니다. 가능하면 실패하는 테스트를 먼저 추가하거나 기존 테스트로 결함을 재현한 뒤 구현합니다.
5. 변경 후에는 해당 앱의 검증 스크립트를 작은 것부터 실행합니다. 일반적인 순서는 `npm run lint`, `npm run test`, `npm run build`이며, 앱에 있으면 `npm run typecheck`, `npm run pages:build`, `npm run test:e2e`도 실행합니다.
6. UI 변경은 가능하면 로컬 dev server를 띄우고 브라우저/Playwright MCP로 실제 화면을 확인합니다. 반응형, 로딩/에러 상태, 텍스트 오버플로, 주요 사용자 플로우를 봅니다.
7. 검증이 끝나면 결과를 요약하고, 실패한 검증이 있으면 원인과 남은 리스크를 명확히 남깁니다.

## TDD와 검증 기준

- 테스트 프레임워크는 앱마다 다릅니다. `snapmany`, `gen-nai/web`, `photokeep`, `clipplay`, `podplay` 등은 Vitest 기반 테스트가 있습니다.
- 테스트가 없는 앱이라도 위험한 로직은 테스트 가능한 단위로 분리하고, 가능하면 Vitest/Testing Library 패턴을 도입합니다.
- 단순 UI 문구나 README 수정만으로 전체 빌드가 과도하면 최소 검증을 선택할 수 있지만, 코드 변경에는 빌드를 기본 게이트로 봅니다.
- Cloudflare 배포 대상 앱은 `npm run build`만으로 충분하지 않을 수 있습니다. `pages:build`, `preview`, `deploy` 스크립트가 있으면 Cloudflare 변환 빌드까지 확인하는 것을 선호합니다.
- 실제 외부 API 호출이 필요한 테스트는 비용과 토큰 사용을 고려합니다. 기본은 mock/MSW/fake를 사용하고, live smoke는 사용자가 원했거나 기존 하네스가 요구할 때만 수행합니다.

## Next.js와 Tailwind 규칙

- 대부분 Next.js 15/16, React 19, TypeScript, Tailwind CSS v4입니다. 일부 오래된 앱은 Tailwind v3, React 18, ESLint 8을 사용합니다. 버전 차이를 가정하지 말고 앱별 `package.json`과 설정을 확인합니다.
- Next.js 최신 버전은 학습된 지식과 다를 수 있습니다. API나 파일 규칙이 애매하면 해당 앱의 `node_modules/next/dist/docs/` 또는 공식 문서를 확인한 뒤 작성합니다.
- App Router를 기본으로 보고, `src/app` 또는 `app` 구조를 따릅니다.
- UI는 Tailwind utility와 기존 컴포넌트 스타일을 우선합니다. 새 디자인 시스템을 만들기보다 앱 안의 버튼, 카드, 탭, 폼, 토큰을 재사용합니다.
- 모바일 화면을 중요하게 봅니다. sticky action, 큰 터치 영역, 텍스트 줄바꿈, 이미지/비디오 비율, loading/error/empty 상태를 확인합니다.

## Cloudflare, Edge, 배포

- 많은 앱이 Cloudflare Pages 또는 Workers Edge Runtime에 배포됩니다.
- `@cloudflare/next-on-pages`를 쓰는 앱에서 `src/app/api/**/route.ts`를 만들거나 수정할 때는 보통 다음 선언이 필요합니다.

```ts
export const runtime = "edge";
```

- 단, 앱별 이력이 우선입니다. 예를 들어 특정 앱에서 Next/Cloudflare 호환성 때문에 runtime 선언을 제거한 커밋이 있으면 README, AGENTS, git log를 확인하고 따릅니다.
- Cloudflare Workers 런타임은 Node API, stream lifecycle, `RequestInit.cache`, 파일 시스템 접근에서 제약이 있습니다. Replicate SDK나 fetch wrapper를 수정할 때는 기존 sibling app의 workaround를 먼저 찾습니다.
- `pages:build` 출력 경로는 앱마다 다릅니다. `.vercel/output/static`, `.pages-out`, `out` 등을 README와 wrangler 설정에서 확인합니다.

## 외부 서비스와 비밀값

- 비밀값은 절대 커밋하지 않습니다. `.env.local`, API token, service role key, OAuth secret, R2 secret, Replicate token, NovelAI token은 서버 전용이어야 합니다.
- 클라이언트에 노출되는 값은 반드시 `NEXT_PUBLIC_*`가 필요한 값인지 확인합니다. `REPLICATE_API_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`, R2 secret은 `NEXT_PUBLIC_*`로 만들지 않습니다.
- 예시 환경 파일은 `.env.example` 또는 `.env.local.example`로만 관리합니다. 실제 값이 들어간 파일을 만들거나 수정하지 않습니다.
- 커밋되는 문서와 예제에는 개인 홈 절대경로, 사용자명, 실제 프로젝트 URL/ref, 실제 Supabase URL, 실제 DB URL을 넣지 않습니다. 로컬 경로는 `$HOME`, `~`, 저장소 상대 경로, `<PLACEHOLDER>`를 사용하고, 서비스 엔드포인트와 토큰은 `"..."` 또는 `<PROJECT_REF>`처럼 가립니다.
- Supabase schema 변경은 코드만 바꾸면 끝나지 않습니다. 필요한 SQL을 명시하고, 배포 전 Supabase Dashboard SQL Editor에서 실행해야 함을 사용자에게 알립니다. 가능하면 migration 미적용 상태에서도 앱이 치명적으로 깨지지 않게 fallback을 둡니다.
- R2 업로드/서빙은 presigned URL, CORS, public URL, metadata JSON 동기화가 자주 얽힙니다. 저장 경로와 metadata 업데이트를 함께 검증합니다.

## AI 생성 앱 패턴

- Replicate/OpenAI/Gemini/NovelAI 관련 토큰은 edge/server route에서만 사용합니다.
- 클라이언트에는 prompt의 민감한 세부나 토큰을 노출하지 않습니다. 스타일 메타데이터와 서버 전용 prompt 파일을 분리하는 패턴을 선호합니다.
- Replicate 기반 앱에서는 `FileOutput` 직렬화, `predictions.create` + polling, 429 `retry_after`, timeout, Cloudflare subrequest 한도를 기존 구현에서 확인합니다.
- 다중 생성 UX는 실패를 전체 실패로 만들지 말고 카드별로 격리하고 재시도할 수 있게 만드는 패턴을 선호합니다.
- 이미지/영상 생성은 비용이 들 수 있으므로 테스트에서는 mock을 우선하고, live smoke 결과는 짧게 기록합니다.

## 커밋과 푸시

- 커밋 메시지는 한국어를 선호합니다. 기술 용어, 라이브러리명, 에러명은 영어를 그대로 써도 됩니다.
- 기존 커밋 스타일은 대체로 `앱이름: 변경 요약`입니다.

```bash
git commit -m "snapmany: 결과 갤러리 재시도 상태 테스트 추가"
git commit -m "gen-nai: 큐 Worker timeout 처리 보강"
```

- 한 작업은 가능하면 작은 단위로 커밋합니다. 스캐폴딩, 기능 구현, 테스트/QA, 배포 수정은 분리하는 것을 선호합니다.
- 코드 변경을 맡았고 사용자가 금지하지 않았다면, 검증 통과 후 커밋과 푸시까지 진행하는 흐름을 선호합니다. 단, 워크트리가 지저분하거나 사용자 변경과 섞여 있으면 먼저 어떤 파일을 포함할지 확인합니다.
- 커밋 전 `git status --short`를 확인하고, 내가 만든 변경만 stage합니다. 사용자가 만든 미추적/수정 파일을 임의로 되돌리거나 함께 커밋하지 않습니다.

## 워크트리 안전

- 이 저장소에는 작업 중인 폴더와 미추적 파일이 많을 수 있습니다. `git reset --hard`, `git checkout --`, 대량 삭제는 사용자가 명시적으로 요청하지 않는 한 사용하지 않습니다.
- 이미 변경된 파일을 수정해야 하면 먼저 내용을 읽고 사용자 변경을 보존합니다.
- 빌드 산출물, 로그, 디버그 파일, `.next`, `.wrangler`, `.vercel`, `out`은 필요한 경우에도 커밋 대상에서 제외하는 것을 기본으로 합니다.
- 중첩 git 저장소가 있는 폴더가 있을 수 있습니다. 예: 일부 앱 폴더에 `.git`이 보이면 그 앱의 git 경계를 확인한 뒤 작업합니다.

## 문서화

- 새 앱이나 큰 기능을 만들면 README의 로컬 실행, 환경 변수, 배포, 테스트 명령을 같이 갱신합니다.
- 한국어 README를 우선하고, 이미 `README_EN.md`가 있으면 영어 문서도 맞춰 갱신합니다.
- 운영상 중요한 우회책은 코드 주석보다 README, `AGENTS.md`, docs의 결정 기록에 남기는 것을 선호합니다.
- Mermaid 다이어그램과 표를 자주 사용하지만, 문서가 과해져 실제 유지보수 정보를 가리지 않게 합니다.

## 자주 쓰는 명령 패턴

대상 앱에서 실행합니다.

```bash
npm install
npm run dev
npm run lint
npm run test
npm run build
npm run pages:build
npm run preview
```

루트에서 탐색할 때는 빠른 검색을 사용합니다.

```bash
rg "검색어" 앱이름
rg --files 앱이름
git log --oneline -- 앱이름
git status --short
```

## 작업 완료 보고

- 변경한 파일, 실행한 검증, 실패/스킵한 검증과 이유를 짧게 보고합니다.
- UI를 확인했다면 어떤 화면과 주요 플로우를 봤는지 적습니다.
- 배포나 live smoke를 수행했다면 URL, 명령, 결과를 남깁니다.
