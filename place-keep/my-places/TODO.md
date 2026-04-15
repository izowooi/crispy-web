# My Places — 사용자 해야 할 일 목록

> 이 파일은 Claude 가 직접 처리하지 못한 작업(외부 키 발급, 로컬 실행 등)을 정리한 체크리스트입니다.

## ✅ Claude 가 이미 완료한 것 (참고)

- [x] `my-places/` Next.js 16 + Tailwind v4 + TypeScript 스캐폴드
- [x] 모든 UI/API 구현 (지도, 폼 시트, 상세 시트, 검색, FAB, 공유 URL)
- [x] **Supabase 프로젝트 `fresh-mint` 에 `pk_places` 테이블 생성 + RLS + anon policy 4개**
- [x] `.env.local` 에 Supabase URL/키 자동 기입
- [x] 실제 Supabase 로 POST / GET / PATCH / DELETE CRUD 전부 동작 확인
- [x] `npm run build` 통과, TypeScript 에러 0
- [x] 지도 API 키 없을 때 graceful fallback (크래시 대신 배너) 검증

👉 **남은 건 Kakao Maps 키 하나 뿐** 입니다.

---

## 🔑 1. Kakao Maps JavaScript 키 발급 (필수)

Kakao 계정만 있으면 10분 안에 끝납니다. 결제수단 등록 불필요, 일 30만 건 무료.

### 단계

1. <https://developers.kakao.com/> 접속 → 우측 상단 **로그인** (카카오 계정)
2. 상단 메뉴 **내 애플리케이션** → **애플리케이션 추가하기**
   - 앱 이름: `my-places` (자유)
   - 사업자명: 본인 이름 또는 아무거나 (자유)
   - **저장**
3. 생성된 앱 클릭 → 좌측 **앱 설정 → 앱 키** 탭
   - **JavaScript 키** 값을 복사 (영숫자 32자리 정도)
4. 좌측 **앱 설정 → 플랫폼** → **Web 플랫폼 등록**
   - 사이트 도메인: `http://localhost:3000`
   - **저장**
   - *(나중에 Cloudflare/Vercel 등에 배포하면 그 도메인도 여기에 추가)*
5. 좌측 **제품 설정 → 카카오맵** → **활성화 설정** ON
6. 좌측 **제품 설정 → 로컬** → **활성화 설정** ON
   - *로컬 API 는 장소 키워드 검색(상단 검색창)에 사용됩니다.*

### 키 적용

`my-places/.env.local` 파일을 열고 `NEXT_PUBLIC_KAKAO_MAP_KEY=` 뒤에 복사한 키를 붙여넣기:

```
NEXT_PUBLIC_KAKAO_MAP_KEY=여기에_복사한_JavaScript_키
NEXT_PUBLIC_SUPABASE_URL=https://elufbvcnhitoksoofbir.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...
```

> Supabase 값은 이미 채워져 있습니다. 건드리지 마세요.

---

## 🚀 2. 앱 실행

```bash
cd my-places
npm run dev
```

브라우저에서 <http://localhost:3000> 접속.

> 주의: **포트 3000** 으로 띄워야 Kakao 에 등록한 도메인과 일치합니다. `PORT=3000 npm run dev` 또는 그냥 `npm run dev` (기본값이 3000).

### 동작 테스트

- [ ] 지도가 풀스크린으로 뜨는지 (서울 시청 주변이 초기 중심)
- [ ] 상단 검색창에 "북촌한옥마을" 입력 → Enter → 결과 클릭 → 폼 시트 열림
- [ ] 제목 50자 카운터가 실시간 업데이트되는지
- [ ] 저장 버튼 → 지도에 마커 생김 → 마커 클릭 → 상세 시트에 내용 보임
- [ ] [편집] → caption 수정 → 저장 → 반영 확인
- [ ] [공유 링크 복사] 클릭 → 새 탭에 붙여넣기 → 해당 장소로 자동 포커스
- [ ] [삭제] → 마커 사라짐

---

## 🔐 3. (나중에) 보안 강화

**지금은 MVP라 로그인 없이 누구나 `pk_places` 를 읽고/쓰고/수정/삭제할 수 있게 열어뒀습니다.** Supabase Advisor 가 이를 `rls_policy_always_true` WARN 으로 잡지만 **의도된 동작** 입니다.

앱을 공개 URL 로 배포할 계획이면 아래 중 하나를 해주세요:

- [ ] **옵션 A**: Supabase Auth 로 내 계정만 쓰기 가능하게 제한
  - `pk_places` 에 `owner_id uuid references auth.users(id)` 컬럼 추가
  - policy 를 `auth.uid() = owner_id` 로 좁힘
- [ ] **옵션 B**: INSERT/UPDATE/DELETE 는 서버사이드 Service Role Key 로만 수행
  - `.env.local` 에 `SUPABASE_SERVICE_ROLE_KEY` 추가 (클라이언트에 노출 금지)
  - API route 에서 `createClient(url, serviceKey)` 로 분기
  - anon policy 에서 SELECT 만 남기고 나머지 3개 DROP
- [ ] **옵션 C**: 그냥 localhost 에서만 쓰고 배포 안 하기 (가장 쉬움)

---

## 📷 4. (나중에) 사진 업로드 기능

MVP 에선 `photo_url` 컬럼만 예약해뒀습니다. 실제 업로드 UI 를 만들려면:

- [ ] Supabase Dashboard → **Storage → New bucket**: 이름 `pk-photos`, Public 체크
- [ ] `pk-photos` bucket 에 policy: `anon INSERT/SELECT` 허용 (혹은 Auth 기반)
- [ ] `components/PlaceFormSheet.tsx` 에 `<input type="file">` 추가, 업로드 후 URL 을 `photo_url` 에 저장

---

## 🧪 5. 빌드 & 배포 (선택)

```bash
cd my-places
npm run build       # 프로덕션 빌드 검증
npm start           # 로컬에서 production 모드 확인
```

배포 옵션:

- **Cloudflare Pages**: `@opennextjs/cloudflare` 로 빌드 (hero-showcase 의 `pages:build` 스크립트 참고)
- **Vercel**: 저장소 연결하면 자동 (Next.js 16 네이티브)

**배포 후 잊지 말 것**:
- [ ] Kakao Developers → 내 앱 → 플랫폼 → Web → 배포 도메인 추가
- [ ] Supabase 대시보드에서 해당 도메인을 Auth 허용 URL 에 추가 (Auth 붙였을 때만)

---

## ❓ 문제가 생기면

| 증상 | 원인 / 해결 |
|------|-------------|
| 지도가 회색이고 `NEXT_PUBLIC_KAKAO_MAP_KEY is not set` 배너 | `.env.local` 에 키 미입력. 위 §1 진행 |
| 지도는 뜨는데 "카카오 SDK script failed to load" | Kakao 콘솔의 Web 플랫폼 도메인에 `http://localhost:3000` 추가 안 됨 |
| 검색이 안 됨 (`Places is not a function`) | **로컬** 제품 활성화 OFF. 콘솔에서 ON |
| 저장 시 `Supabase is not configured` | `.env.local` 재확인 후 dev 서버 **재시작** (env 는 시작할 때만 로드됨) |
| 마커가 저장은 되는데 다시 불러와도 안 보임 | `pk_places` RLS policy 확인. 이미 설정됨. 대시보드 → Authentication → Policies 에서 `pk_places_anon_select` 가 보여야 함 |

---

## 📌 요약 (한눈에)

```
지금 할 일:
  1. Kakao Developers 에서 JavaScript 키 받기 (10분)
  2. .env.local 의 NEXT_PUBLIC_KAKAO_MAP_KEY= 뒤에 붙여넣기
  3. cd my-places && npm run dev
  4. http://localhost:3000 열어서 테스트

Supabase / DB: 이미 끝. 건드릴 필요 없음.
```
