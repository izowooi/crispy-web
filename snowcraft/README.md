# Snowcraft

Snowcraft는 과거 Flash 게임을 현대 브라우저에서 다시 플레이할 수 있게 복원한 Vite/TypeScript canvas 게임입니다. 이 폴더에는 배포 가능한 웹게임만 남깁니다. `snow-craft/`, `approach-*`, `swf-bundle/`, `decompiled/`, `observations/` 같은 리버스 엔지니어링 작업물은 참고 자료일 뿐 배포 입력이 아닙니다.

## 로컬 실행

```bash
npm install
npm run dev
```

Vite dev server를 연 뒤 canvas 안의 START 버튼을 누르면 게임이 시작됩니다.

## 검증

```bash
npm run test
npm run build
npm run test:e2e
```

`npm run test:e2e`는 앱을 빌드하고 Vite preview를 `4273` 포트에서 띄운 뒤 Playwright를 실행합니다.

## Cloudflare Pages

모노레포에서 Vite 정적 사이트로 배포합니다.

- Root directory: `snowcraft`
- Framework preset: `Vite` or `React (Vite)`
- Build command: `npm run build`
- Build output directory: `dist`
- Environment variables: 현재 필요 없음

Cloudflare Pages 공식 문서 기준으로 React/Vite 프로젝트의 build command는 `npm run build`, output directory는 `dist`입니다. 모노레포에서는 root directory를 프로젝트 폴더로 지정해야 합니다.

- https://developers.cloudflare.com/pages/configuration/build-configuration/
- https://developers.cloudflare.com/pages/configuration/git-integration/
