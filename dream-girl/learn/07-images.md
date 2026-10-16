# 07. 이미지 생성

- 프롬프트 아카이브: [docs/IMAGE_PROMPTS.md](../docs/IMAGE_PROMPTS.md)
- 모델: Nano Banana (`google/nano-banana`), 비율 3:4 → `sips -z 1200 896` 로 896×1200 통일.
- 남성 캐릭터는 프롬프트에 `handsome tall masculine young man, broad shoulders, sharp masculine jawline` 를 명시해야 장발도 남성으로 나옵니다.
- 동시 2개 + 429 `retry_after` 대기 패턴으로 일괄 생성.
- API 토큰은 환경변수/로컬 `.env`에서만 읽고 **절대 커밋하지 않습니다.**
