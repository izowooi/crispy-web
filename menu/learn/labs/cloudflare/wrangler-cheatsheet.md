# wrangler 치트시트 (baby-menu 기준)

> `menu/` 폴더에서 실행합니다. wrangler 는 `devDependencies` 에 4.x 가 설치되어 있어 `npx wrangler …` 로 씁니다.
> 🟢 읽기 전용 / 🟡 로컬만 바뀜 / 🔴 **운영에 영향** — 🔴 은 의도했을 때만 실행하세요.
> 명령 목록은 `npx wrangler --help`, 한 단계 안쪽은 `npx wrangler d1 --help` 처럼 볼 수 있습니다.
> (이 환경의 wrangler 4.110 에서는 세 단계 이상 `--help` 가 최상위 도움말로 되돌아갑니다. 그럴 땐 공식 문서의 명령 레퍼런스를 보세요:
> <https://developers.cloudflare.com/workers/wrangler/commands/>)

## 계정 · 상태

| | 명령 | 설명 |
|---|---|---|
| 🟢 | `npx wrangler whoami` | 로그인한 계정과 권한 확인 |
| 🟢 | `npx wrangler deployments list` | 최근 배포 10개 (시각·출처·버전) |
| 🟢 | `npx wrangler deployments status` | 지금 운영 중인 버전 |
| 🟢 | `npx wrangler versions list` | 최근 버전 10개 |
| 🟢 | `npx wrangler secret list` | secret **이름**만 (값은 못 봄) |

## 개발 · 미리보기

| | 명령 | 설명 |
|---|---|---|
| 🟡 | `npx wrangler dev` | 로컬에서 Worker 실행 (기본이 로컬 모드). `--port 8799` 로 포트 지정 |
| 🟡 | `npm run preview` | 이 앱을 빌드해서 로컬 Workers 런타임으로 실행 |
| 🟢 | `npx wrangler deploy --dry-run --outdir <폴더>` | **배포 없이** 번들링만 하고 크기(`Total Upload`/`gzip`) 출력 |

## 로그

| | 명령 | 설명 |
|---|---|---|
| 🟢 | `npx wrangler tail baby-menu` | 운영 로그 실시간 스트림 |
| 🟢 | `npx wrangler tail baby-menu --status error --format pretty` | 에러 요청만, 읽기 쉬운 형식 |
| 🟢 | `npx wrangler tail baby-menu --search "analyze failed"` | `console` 메시지에 문구가 있는 것만 |
| 🟢 | `npx wrangler tail baby-menu --method POST --ip self` | 내가 보낸 POST 만 |

## D1 (데이터베이스)

| | 명령 | 설명 |
|---|---|---|
| 🟢 | `npx wrangler d1 list` / `npx wrangler d1 info baby-menu` | DB 목록 / 크기·상태 |
| 🟡 | `npm run db:migrate:local` | 로컬 DB 에 마이그레이션 적용 |
| 🔴 | `npm run db:migrate:remote` | **운영 DB** 에 마이그레이션 적용 |
| 🟡 | `npx wrangler d1 execute baby-menu --local --command "SELECT …"` | 로컬 DB 에 SQL |
| 🟢→🔴 | `npx wrangler d1 execute baby-menu --remote --command "SELECT …"` | **운영 DB** 에 SQL. `SELECT` 는 읽기, `UPDATE/DELETE` 는 🔴 |
| 🟢 | `npx wrangler d1 export baby-menu --remote --output <파일>.sql` | 운영 DB 를 SQL 파일로 백업 (저장소 **밖**에 두기!) |
| 🟢 | `npx wrangler d1 time-travel info baby-menu` | 복구 가능한 시점(bookmark) 확인 |
| 🔴 | `npx wrangler d1 time-travel restore baby-menu --timestamp <…>` | DB 를 과거로 되돌림 (덮어쓰기, 되돌리는 bookmark 가 출력됨) |

`d1 execute` 의 옵션은 직접 확인한 목록입니다: `--command`, `--file`, `--local`, `--remote`, `--persist-to <폴더>`, `--json`, `-y`.

## R2 (사진)

| | 명령 | 설명 |
|---|---|---|
| 🟢 | `npx wrangler r2 bucket lifecycle list baby-menu` | 보관 기간 규칙 보기 |
| 🔴 | `npx wrangler r2 bucket lifecycle add baby-menu …` / `remove baby-menu --id <규칙>` | 규칙 추가·삭제 (옵션은 공식 문서 참고) |

## 배포 · 되돌리기 · 비밀값

| | 명령 | 설명 |
|---|---|---|
| 🔴 | `npm run deploy` | 빌드 + 운영 배포 (`opennextjs-cloudflare deploy`) |
| 🔴 | `npx wrangler rollback [version-id] -m "이유"` | 이전 버전으로 되돌림 (`-y` 는 확인 생략) |
| 🔴 | `npx wrangler secret put CLAUDE_API_KEY` | 키 교체. 값은 프롬프트에 **입력**(인자로 쓰지 않기). 즉시 새 버전으로 배포됨 |
| 🔴 | `npx wrangler secret delete <이름>` | secret 삭제 |

## 한 줄 규칙

- D1 명령은 **항상 `--local` 또는 `--remote` 를 명시**하세요. 생략했을 때의 기본값은 명령·버전마다 달라질 수 있어서 믿지 않는 편이 안전합니다.
  (`d1 export` 는 4.110 에서 생략하면 로컬 DB 를 대상으로 한다는 안내가 나오는 것을 확인했습니다.)
- 운영에 쓰는 명령은 **복붙하기 전에 읽고**, `--remote` 가 붙었는지 한 번 더 봅니다.
