# Coverloc — AI 커버 이미지 현지화

커버 이미지 속 텍스트를 다른 언어로 바꿔 주는 웹앱과 CLI입니다.
최종 결과물은 항상 **원본과 같은 가로×세로 크기**로 저장됩니다.

| 모델 | ID | 비고 |
|---|---|---|
| GPT Image 2.6 Sunburst | `gpt-image-2.6-sunburst` (`sunburst`) | 느리지만 세밀한 편집 |
| GPT Image 2.6 Flare | `gpt-image-2.6-flare` (`flare`) | 빠름 |
| Nano Banana 2.1 | `gemini-nano-banana-2.1` (`nb21`) | Gemini 최신 이미지 모델 |
| Nano Banana Pro / 2 | `gemini-3-pro-image` (`nbpro`) / `gemini-3.1-flash-image` (`nb2`) | 선택 사항 |

언어: `en`, `ja`, `zh-Hans`, `zh-Hant`, `ko` (원본 언어 → 대상 언어 아무 조합이나 가능. `coverloc/config.py`의 `LANGUAGES`에서 추가하거나 고정할 수 있습니다)

## 실행

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt   # 처음 한 번
bin/coverloc serve                 # 웹앱 → http://127.0.0.1:8787
```

API 키는 `.env.local`에서 읽습니다 (`OPENAI_API_KEY`, `GEMINI_API_KEY`).

### CLI

```bash
# 이미지 한 장 → 일본어 (기본 모델 3개로 비교)
bin/coverloc run docs/cover.png --to ja

# 폴더 전체 → 일본어 + 중국어 간체, 모델 지정
bin/coverloc run docs/ --to ja zh-Hans --model sunburst nb21

# 배치 (50% 할인, 비동기·최대 24시간)
bin/coverloc run docs/ --to ja zh-Hans --batch
bin/coverloc batch list
bin/coverloc batch status <job_id>     # 완료된 그룹부터 결과를 받아 저장
bin/coverloc batch wait <job_id>       # 끝날 때까지 폴링

# 로깅(store) 켜기 — 기본값은 꺼짐
bin/coverloc run docs/cover.png --to ja --store

bin/coverloc models   # 모델 · 가격 · 언어 목록
bin/coverloc runs     # 지난 실행 기록
```

주요 옵션: `--from en|auto`, `--quality low|medium|high|xhigh|max` (OpenAI, 기본 high),
`--openai-mode responses|images`, `--image-size auto|1K|2K|4K` (Gemini), `--extra "추가 지시"`.

## 원본 크기는 어떻게 지키나요?

보정은 하지 않습니다. 모델 출력 픽셀을 그대로 쓰고, 정렬 상태는 측정해서 보고만 합니다.

| 단계 | OpenAI (GPT Image 2.6) | Gemini (Nano Banana) |
|---|---|---|
| 모델에 보내는 크기 | 임의 크기를 받지만 16의 배수만 허용 → 원본을 가장자리 복제로 **패딩만** (예: 1800×1200 → 1808×1200) | 비율별 고정 해상도만 출력 (3:2 2K = 2528×1696) → 원본을 그 비율로 패딩 |
| 원본 크기로 되돌리기 | 패딩만 잘라냄 (**리샘플링 없음**) | 균일 비율로 리사이즈 후 패딩을 잘라냄 (**리샘플링 1회**) |
| 측정 | ECC 정합으로 이동·스케일·최대 드리프트(px), 변경 영역 %, 변경 외 영역 PSNR | 같음 |

결과 폴더(`outputs/<run>/<image>/`)에는 이미지마다 아래 파일이 저장됩니다.
- `<lang>__<model>.png` — 최종 결과 (원본 크기)
- `.model-raw.png` — 모델이 실제로 출력한 이미지
- `.diff.jpg` — 원본과의 차이 맵
- `.json` — usage, 비용, 정렬 측정값, 프롬프트

## 로깅 (store)

| 경로 | 기본값 | 비고 |
|---|---|---|
| OpenAI Responses API (`--openai-mode responses`, 기본) | `store:false` | `--store` 또는 웹 토글로 켤 수 있음 |
| OpenAI Images API (`--openai-mode images`) | 해당 없음 | Images API는 `store`를 받지 않음 (실제 호출 시 `Unknown parameter: 'store'`) |
| Gemini `generateContent` (배치 포함) | `store:false` | 요청 단위 `store`가 프로젝트 설정보다 우선 |

## 원격 로그 · 파일 삭제 (웹 "로그 관리" 탭 / CLI `logs`)

| 남는 것 | 삭제 방법 |
|---|---|
| Responses `store:true` → 대시보드 **Logs** | `DELETE /v1/responses/{id}`. 목록 조회(`GET /v1/responses`)는 **세션 키(sess-…)만** 허용 → 웹에서 세션 키 입력 또는 대시보드 HAR 파일을 불러오면(브라우저 안에서만 파싱) 목록 조회·선택 삭제. ID만 알면 API 키로 삭제 가능 |
| 이 앱이 `store:true`로 만든 응답 | 결과 JSON에 `response_id`를 기록 → "이 앱이 저장한 로그"에서 바로 삭제 |
| OpenAI Images API | 저장 객체 없음 (Logs에 안 남음) |
| OpenAI 배치 (Responses·Images API 모두) | 배치 기록은 삭제 API 없음(`DELETE /v1/batches` → Invalid method). 입력/출력 JSONL 파일(이미지·프롬프트 포함)은 `DELETE /v1/files/{id}` |
| Gemini 배치 | `DELETE batches/{id}` + 업로드 파일 `DELETE files/{id}` |

배치 실행 시 기본값으로 **결과를 로컬에 저장한 뒤 원격 배치 파일을 자동 삭제**합니다 (`--keep-remote-files`로 끌 수 있음).

```bash
bin/coverloc logs local                 # 이 앱이 store:true로 남긴 응답
bin/coverloc logs delete resp_…         # ID로 삭제
bin/coverloc logs purge batch_… batches/…  # 배치 ID로 파일(·Gemini 배치) 삭제
bin/coverloc logs batches [--purge]     # 배치별 남은 원격 파일 / 일괄 삭제
```

## 웹앱 비교 뷰어

결과 카드를 클릭하면 열립니다.
- **플립**: `Space` 또는 클릭으로 A/B 전환. 자동 전환 속도도 조절 가능
- **슬라이더**: 가운데 선을 드래그해 좌우로 비교
- **나란히**: 두 이미지를 나란히 놓고 확대/이동을 함께 적용
- **차이**: 원본과의 차이 맵

`←`/`→`로 B 이미지를 바꾸고, `0`은 화면 맞춤, `1`은 100%, 휠은 확대, 드래그는 이동입니다.
