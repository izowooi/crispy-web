# My Places

네이버 지도 "저장" 기능처럼 **내가 다녀온 장소를 지도 위에 기록**하는 개인용 웹앱.

- 제목 **50자** + 상세 **캡션** 분리 입력
- 마커 클릭 → 상세 시트 → 수정 / 삭제 원클릭
- Kakao Maps 기반 풀스크린 지도
- 공유 URL (`/?id=<short_id>`) 로 특정 장소 열람

## 기술 스택

- Next.js 16 (App Router) · React 19 · TypeScript 5
- Tailwind CSS v4
- Kakao Maps JS SDK (`services` 라이브러리 포함)
- Supabase (PostgreSQL)

## 1. 설치

```bash
cd my-places
npm install
cp .env.local.example .env.local
# .env.local 을 자신의 키로 채운 뒤
npm run dev
# http://localhost:3000
```

## 2. Kakao Maps API 키 발급

1. <https://developers.kakao.com/> 로그인 (카카오 계정)
2. **내 애플리케이션 → 애플리케이션 추가하기** → 앱 이름/사업자명 임의 입력
3. 생성된 앱 → **앱 키** 탭 → **JavaScript 키** 복사
4. 좌측 메뉴 **플랫폼 → Web 플랫폼 등록** → 사이트 도메인에 `http://localhost:3000` 추가 (배포 도메인도 생기면 함께 등록)
5. **제품 설정 → 카카오맵** 사용 설정 **ON**
6. **제품 설정 → 로컬** 사용 설정 **ON** (장소 검색에 사용)
7. 복사한 JavaScript 키를 `.env.local` 의 `NEXT_PUBLIC_KAKAO_MAP_KEY` 에 붙여넣기

> 로드되는 SDK URL: `https://dapi.kakao.com/v2/maps/sdk.js?appkey=<KEY>&libraries=services&autoload=false`
>
> `services` 라이브러리를 빼면 장소 검색(`kakao.maps.services.Places`)이 동작하지 않습니다.

### Naver Maps 를 쓰지 않은 이유

| 항목 | Kakao | Naver |
|------|-------|-------|
| 무료 쿼터 | 일 30만 건 (지도+로컬) | Web Dynamic Map 일 10만 건, Static 1만 건 |
| 가입 난이도 | 카카오 계정만 있으면 OK | NCP 가입 + 결제수단 등록 필요 |
| 키워드 검색 | `services.Places` 바로 사용 | 지도와 별도 Open API (Search) 사용 |
| 이 프로젝트 선택 | ✅ | ❌ |

> Kakao 가 Naver 에 비해 **가입 장벽이 낮고 무료 쿼터가 넉넉**해서 채택했습니다.
> Naver 로 바꾸고 싶다면 `lib/kakaoLoader.ts` + `components/KakaoMap.tsx` + `components/PlaceSearchBox.tsx` 세 파일을 교체하면 됩니다.

## 3. Supabase 설정

1. <https://supabase.com/> 에서 새 프로젝트 생성 (Free tier 로 충분)
2. 좌측 **Settings → API** 에서 다음 두 값 복사
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. **SQL Editor** 에서 아래 마이그레이션 실행 ⚠️ **앱 배포 전에 반드시**:

```sql
create extension if not exists "pgcrypto";

create table public.pk_places (
  id            uuid primary key default gen_random_uuid(),
  short_id      text unique not null default substr(md5(random()::text || clock_timestamp()::text), 1, 8),
  title         varchar(50) not null,
  caption       text,
  lat           double precision not null,
  lng           double precision not null,
  address       text,
  place_name    text,
  category      text,
  visited_at    date,
  photo_url     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index pk_places_created_at_idx on public.pk_places (created_at desc);
```

4. (MVP) 단일 사용자 / 로그인 없음 → **Authentication → Policies** 에서 `pk_places` 테이블의 RLS 를 **끄거나**, `anon` 대상 `select/insert/update/delete` 4개 policy 를 모두 허용으로 둔다.

> 테이블을 만들기 전에 앱을 실행해도 **빈 지도 + 배너**가 뜰 뿐 크래시는 나지 않습니다 (graceful fallback).

## 4. 개발 서버

```bash
npm run dev
```

- `http://localhost:3000` 접속 → 풀스크린 지도
- 우하단 `＋` 버튼: 현재 지도 중심 좌표로 새 장소 저장
- 상단 검색창: Kakao 키워드 검색 후 결과 선택 → 새 장소 저장
- 마커 클릭: 상세 시트 → **편집 / 삭제 / 공유 링크 복사**
- `/?id=<short_id>` 로 접속 시 해당 장소로 자동 포커스

## 5. 빌드

```bash
npm run build
npm start
```

## 6. 데이터 모델

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | uuid | 내부 PK |
| `short_id` | text (unique) | 공유 URL 용 짧은 ID |
| `title` | varchar(50) | 핵심 메모 (50자 제한) |
| `caption` | text | 자유 길이 상세 메모 |
| `lat`, `lng` | double | 좌표 |
| `address`, `place_name`, `category` | text | 부가 정보 (선택) |
| `visited_at` | date | 방문일 (선택) |
| `photo_url` | text | 2차 스프린트용 (현재 미사용) |

## 7. 로드맵

- 사진 업로드 (Supabase Storage)
- Supabase Auth 붙여 다중 사용자
- 지도 롱프레스로 임의 좌표 지정
- 카테고리 필터 UI
- GPS 기반 "내 위치 근처" 검색
