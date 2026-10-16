# 06. 배포

```bash
npm run db:migrate     # D1 스키마 (최초 1회)
npm run upload:images  # R2에 64장 업로드 (최초/변경 시)
npm run deploy         # build + cf deploy
```
- 도메인은 `domains` 배열에 적으면 cf가 커스텀 도메인과 DNS를 연결합니다 (존이 같은 계정에 있어야 함).
- 확인: `curl https://<YOUR_DOMAIN>/api/health`
- 롤백: 이전 커밋으로 되돌려 `npm run deploy`.
