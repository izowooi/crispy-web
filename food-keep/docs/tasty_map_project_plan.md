# 동네 맛집 지도 프로젝트 기획서 (Minimalist Web Map)

## 1. 프로젝트 개요
- **목적**: 네이버 지도에 저장된 개인 맛집 데이터를 별도의 로그인 없이 누구나 볼 수 있는 웹 서비스로 구현.
- **핵심 가치**: 단순함(Minimalism), 접근성(No Login), 저비용(Free Tier).
- **영감**: 붕어빵 지도, 화장실 지도와 같은 직관적인 단일 목적 서비스.

## 2. 기술 스택 (Tech Stack)
- **Frontend**: Next.js (App Router)
- **Styling**: Tailwind CSS (단조롭고 깔끔한 UI 구성)
- **Database**: Supabase (PostgreSQL / 맛집 정보 및 좌표 저장)
- **Map API**: Kakao Maps API (일일 30만 건 무료 쿼터 활용)
- **Deployment**: Cloudflare Pages (Vercel 대신 사용, 빠르고 안정적인 엣지 컴퓨팅 환경)

## 3. 주요 기능 (Key Features)
- **맛집 렌더링**: DB에 저장된 위도/경도 데이터를 기반으로 지도에 마커 표시.
- **상세 정보 팝업**: 마커 클릭 시 가게 이름, 한 줄 평, 추천 메뉴 등 최소 정보만 노출.
- **주소 검색 및 등록**: (관리자용) 주소를 입력하면 좌표로 변환하여 DB에 저장하는 기능.
- **공유용 URL**: 별도의 로그인 과정 없이 URL 접속만으로 지도 열람 가능.

## 4. UI/UX 디자인 원칙
- **Full Screen Map**: 접속 시 지도가 화면 전체를 차지하도록 설계.
- **No Clutter**: 불필요한 사이드바, 광고, 복잡한 필터를 배제.
- **Mobile First**: 동네에서 이동 중에도 보기 편하도록 반응형 레이아웃 적용.

## 5. 데이터 마이그레이션 계획
1. 네이버 지도 북마크 리스트 정리.
2. Kakao 로컬 API의 Geocoding(주소->좌표 변환) 기능을 활용하여 좌표 데이터 추출.
3. Supabase 테이블에 `id, name, lat, lng, description` 구조로 데이터 적재.

## 6. 향후 확장 가능성
- 내 위치 중심 맛집 찾기 (GPS 연동).
- 간단한 카테고리 필터 (식당, 카페, 술집).
