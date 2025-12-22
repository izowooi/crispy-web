# ClipPlay - 가족 동영상 공유

<div align="center">

[![Live Demo](https://img.shields.io/badge/Live_Demo-clipplay.pages.dev-6366f1?style=for-the-badge)](https://clipplay.pages.dev/)
[![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Pages-F38020?style=for-the-badge&logo=cloudflare)](https://pages.cloudflare.com/)

**가족과 함께 공유하는 짧은 동영상 클립**

[사용 방법](#-사용-방법) | [로컬 실행](#-로컬에서-실행하기) | [보안 설계](#-보안--트래픽-고려사항)

</div>

---

## 프로젝트 소개

**ClipPlay**는 가족 동영상 클립을 공유하고 시청하는 웹 애플리케이션입니다.

틱톡 스타일의 세로 스와이프 피드로 동영상을 편하게 탐색할 수 있습니다.

### 주요 기능

- **세로 스와이프 피드** - 틱톡처럼 세로로 넘기며 탐색
- **PWA 지원** - 앱처럼 설치하고 사용
- **다크/라이트 테마** - 시스템 설정에 따른 자동 테마 전환
- **보안 관리자 시스템** - Google OAuth 기반 안전한 콘텐츠 관리
- **엣지 배포** - Cloudflare 글로벌 CDN으로 빠른 로딩
- **제목 검색** - 클립 제목으로 빠르게 검색

---

## 사용 방법

1. **클립 탐색하기**
   - 세로로 스와이프하여 다음/이전 클립 이동
   - 검색창에서 제목으로 클립 찾기

2. **클립 시청**
   - 화면 탭으로 재생/일시정지
   - 음소거 버튼으로 오디오 컨트롤

3. **PWA 설치** (선택)
   - 브라우저 메뉴 → "홈 화면에 추가"
   - 앱처럼 독립 실행 가능

---

## 기술 스택

| 카테고리 | 기술 | 용도 |
|:---:|:---:|:---|
| **프레임워크** | Next.js 16.0.10 | App Router 기반 풀스택 애플리케이션 |
| **라이브러리** | React 19.2.1 | UI 컴포넌트 & 상태 관리 |
| **언어** | TypeScript 5 | 타입 안정성 보장 |
| **스타일링** | Tailwind CSS 4 | 유틸리티 기반 CSS |
| **호스팅** | Cloudflare Pages | 글로벌 엣지 배포 |
| **스토리지** | Cloudflare R2 | S3 호환 미디어 저장소 |
| **인증** | Google OAuth 2.0 | 관리자 로그인 |
| **JWT** | Jose | 세션 토큰 관리 |
| **테스트** | Vitest + Testing Library | 단위/컴포넌트 테스트 |

---

## 프로젝트 구조

```
clipplay/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API 라우트 (Edge Runtime)
│   │   │   ├── auth/             # OAuth & 세션 관리
│   │   │   └── admin/            # 관리자 전용 API
│   │   ├── admin/                # 관리자 페이지
│   │   ├── clip/[id]/            # 클립 상세 페이지
│   │   ├── layout.tsx            # 루트 레이아웃
│   │   └── page.tsx              # 메인 페이지
│   ├── components/               # React 컴포넌트
│   │   ├── player/               # 비디오 플레이어
│   │   ├── clip/                 # 클립 카드/리스트/피드
│   │   └── ui/                   # 공통 UI 컴포넌트
│   ├── lib/                      # 유틸리티 라이브러리
│   │   ├── r2/                   # Cloudflare R2 클라이언트
│   │   └── auth/                 # Google OAuth 로직
│   ├── context/                  # React Context
│   │   ├── AuthContext.tsx       # 인증 상태
│   │   └── PlayerContext.tsx     # 플레이어 상태
│   ├── hooks/                    # 커스텀 훅
│   └── types/                    # TypeScript 타입
├── public/                       # 정적 에셋
│   ├── manifest.json             # PWA 매니페스트
│   ├── sw.js                     # Service Worker
│   └── icons/                    # 앱 아이콘
├── __tests__/                    # 테스트 파일
├── wrangler.toml                 # Cloudflare 설정
└── package.json                  # 의존성 관리
```

---

## 주요 기능 상세

### 1. 세로 스와이프 피드
- 틱톡 스타일 전체화면 동영상 피드
- 터치/휠 이벤트로 클립 전환
- 자동 재생 & 음소거 컨트롤

### 2. 클립 검색
- 제목 기반 검색
- 검색 시 리스트 뷰로 전환

### 3. PWA (Progressive Web App)
- 홈 화면 설치 가능
- 오프라인 지원 (Service Worker)
- 독립 실행 모드 (standalone)

### 4. 관리자 기능 (인증 필요)
- 동영상 파일 업로드 (최대 200MB)
- 클립 정보 수정
- 클립 삭제
- 메타데이터 관리

---

## 로컬에서 실행하기

### 사전 준비물

1. **Node.js** (버전 20 이상)
2. **Git** (선택사항)

### 실행 방법

```bash
# 1. 프로젝트 다운로드
git clone https://github.com/izowooi/crispy-web.git

# 2. clipplay 폴더로 이동
cd crispy-web/clipplay

# 3. 패키지 설치
npm install

# 4. 환경변수 설정
cp .env.example .env.local
# .env.local 파일 편집

# 5. 개발 서버 실행
npm run dev
```

### 브라우저에서 확인

```
http://localhost:3000
```

### 사용 가능한 명령어

| 명령어 | 설명 |
|-------|------|
| `npm run dev` | 개발 서버 실행 (포트 3000) |
| `npm run build` | 프로덕션 빌드 생성 |
| `npm run start` | 빌드된 앱 실행 |
| `npm run lint` | 코드 검사 |
| `npm run test` | 테스트 실행 |

### 환경 변수 설정

```bash
# Cloudflare R2 (필수)
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=your-bucket-name
NEXT_PUBLIC_R2_PUBLIC_URL=https://your-bucket.r2.dev

# Google OAuth (관리자 기능 사용 시 필수)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# JWT (필수)
JWT_SECRET=your-jwt-secret
```

---

## 배포하기

### Cloudflare Pages 배포

1. [Cloudflare Dashboard](https://dash.cloudflare.com/)에 로그인
2. "Workers & Pages" → "Create Application" → "Pages"
3. GitHub 저장소 연결
4. 설정:
   - **Root directory**: `clipplay`
   - **Build command**: `npm run build`
   - **Build output directory**: `.next`
5. 환경 변수 설정 (Settings → Environment Variables)
6. "Save and Deploy" 클릭

---

## 보안 & 트래픽 고려사항

### 보안 설계

- HttpOnly + Secure + SameSite 쿠키 → XSS/CSRF 공격 방어
- JWT HS256 서명 (7일 만료) → 안전한 세션 관리
- 관리자 이메일 화이트리스트 → 허가된 사용자만 관리 기능 접근
- 파일 업로드 검증 → video/* MIME 타입만 허용, 200MB 크기 제한
- Edge Runtime → 서버리스 환경에서 민감 정보 노출 최소화

### 트래픽 최적화

| 전략 | 설명 |
|-----|------|
| **글로벌 CDN** | Cloudflare의 전 세계 300+ 엣지 서버에서 콘텐츠 제공 |
| **R2 직접 서빙** | 미디어 파일을 Public URL로 직접 제공, 서버 부하 제로 |
| **Service Worker** | Network-first 캐싱으로 빠른 응답 + 오프라인 지원 |
| **Edge Runtime** | 사용자와 가장 가까운 엣지에서 API 실행 |

---

## 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.

---

## 만든 사람

**izowooi**

궁금한 점이나 제안사항이 있으시면 Issue를 남겨주세요!

---

<div align="center">

**이 프로젝트가 마음에 드셨다면 Star를 눌러주세요!**

Made with Next.js & Cloudflare

[지금 사용하기](https://clipplay.pages.dev/)

</div>
