# Big Five 심리 성향 검사

`big-five` 폴더에 만든 독립 Next.js 웹앱입니다. 180문항 Big Five 자기보고 검사를 진행하고, 완료 후 5대 요인과 30개 세부척도 결과를 시각화합니다.

## 실행

```bash
npm install
npm run dev
```

## 검증

```bash
npm run docs:questionnaire
npm run test
npm run lint
npm run build
npm run pages:build
```

## 문서

- `docs/PLAN.md`: 재구현 가능한 상세 계획서
- `docs/QUESTIONNAIRE.md`: 180문항 전체 검사지와 채점 규칙
- `src/data/questionnaire.json`: 앱이 사용하는 원천 문항 데이터

## 참고

문항 구조는 공개 Big Five/IPIP 자료를 참고했습니다. 앱의 한국어 문항은 원문 복사나 직역이 아닌 새로 작성한 문항입니다.

- IPIP 공식 사이트: https://ipip.ori.org/
- IPIP Big Five/FFM 안내: https://ipip.ori.org/Finding_Scales_to_Measure_Particular_Constructs.htm
- NIH IPIP NEO CDE: https://www.nih.gov/node/21486
