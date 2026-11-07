# 🎬 ClipPlay - 가족 비디오 스트리밍

<div align="center">

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-clipplay.zowoo.uk-gray?style=for-the-badge)](https://clipplay.zowoo.uk/)
[![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Tunnel-F38020?style=for-the-badge&logo=cloudflare)](https://cloudflare.com/)

**가족의 소중한 순간을 TikTok 스타일로 감상하세요!** ✨

[🎯 주요 기능](#-주요-기능) | [🏗️ 기술 스택](#%EF%B8%8F-기술-스택) | [💻 로컬 실행](#-로컬에서-실행하기) | [📱 사용법](#-사용-방법)

</div>

---

## 🎯 프로젝트 소개

ClipPlay는 **가족 동영상을 위한 프라이빗 비디오 스트리밍 플랫폼**입니다.

세로 영상에 최적화된 TikTok 스타일의 풀스크린 피드로 소중한 추억을 감상하고, 특별한 날짜의 영상을 모아보는 "추억 모음" 기능으로 과거의 순간들을 다시 만나보세요! 📹✨

### ✨ 주요 기능

- 📱 **세로 스와이프 피드** - TikTok처럼 위아래로 스와이프하며 영상 감상
- 🖼️ **그리드 뷰** - 썸네일로 영상 목록을 한눈에 확인
- 💕 **추억 모음** - 특정 날짜/월/연도별로 영상 필터링
- 🔐 **Google OAuth 관리자** - 허용된 사용자만 업로드 가능
- 📤 **대용량 업로드** - 32MB 청크 업로드로 대용량 영상 업로드 (진행률 표시)
- 🎨 **다크/라이트 테마** - 눈이 편한 테마 선택
- 📲 **PWA 지원** - 홈 화면에 앱처럼 설치 가능
- 🔄 **실시간 새로고침** - 캐시 우회 강제 새로고침

---

## 🎮 사용 방법

```mermaid
graph TD
    A[🏁 사이트 접속] --> B{보기 모드 선택}
    B -->|피드| C[📱 세로 스와이프<br/>위아래로 넘기기]
    B -->|그리드| D[🖼️ 썸네일 목록<br/>클릭하여 재생]
    B -->|추억| E[💕 추억 모음]

    C --> F[🎬 영상 재생<br/>터치로 재생/정지]
    D --> F

    E --> G{필터 선택}
    G -->|특정 날짜| H[📅 매년 12/25<br/>크리스마스 영상]
    G -->|월별 타임라인| I[📆 월당 1개씩<br/>랜덤 선택]
    G -->|연도별| J[🗓️ 특정 연도<br/>모든 영상]

    H --> K[▶️ 슬라이드쇼 재생]
    I --> K
    J --> K

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style E fill:#ff69b4,stroke:#333,stroke-width:2px
    style F fill:#4CAF50,stroke:#333,stroke-width:2px
```

### 📝 화면별 가이드

#### 1️⃣ 피드 뷰 (메인)
| 동작 | 설명 |
|:---:|:---|
| ⬆️ 위로 스와이프 | 다음 영상 |
| ⬇️ 아래로 스와이프 | 이전 영상 |
| 👆 화면 터치 | 재생/정지 |
| 🔊 스피커 아이콘 | 음소거 토글 |
| 🔄 새로고침 버튼 | 최신 목록 불러오기 |

#### 2️⃣ 그리드 뷰
- 🔍 **검색**: 제목/설명으로 영상 검색
- 📷 **썸네일**: 클릭하면 해당 영상 재생
- 📊 **정보 표시**: 제목, 이모지, 재생시간

#### 3️⃣ 추억 모음
| 모드 | 설명 | 예시 |
|:---:|:---|:---|
| 📅 특정 날짜 | 매년 같은 날 촬영된 영상 | 크리스마스, 생일 |
| 📆 월별 타임라인 | 월당 1개씩 랜덤 선택 | 1년 요약 |
| 🗓️ 연도별 | 특정 연도의 모든 영상 | 2023년 추억 |

---

## 🏗️ 기술 스택

<div align="center">

| 카테고리 | 기술 |
|---------|------|
| **프레임워크** | Next.js 16.0.10 (App Router) |
| **라이브러리** | React 19.2.1 |
| **언어** | TypeScript 5 |
| **스타일링** | Tailwind CSS 4.0 |
| **인증** | Google OAuth 2.0 + JWT (jose) |
| **스토리지** | 맥미니 로컬 디스크 (`CLIPPLAY_DATA_DIR`) |
| **배포** | `next start` + pm2 on Mac mini, Cloudflare Tunnel (`clipplay.zowoo.uk`) |
| **테스트** | Vitest + Testing Library |

</div>

### 🎨 아키텍처

```mermaid
graph LR
    B[🖥️ 브라우저] -->|https| CF[☁️ Cloudflare Edge<br/>미디어 캐시]
    CF -->|Tunnel| N[⚡ Next.js on Mac mini<br/>127.0.0.1:5110]
    N --> D[(CLIPPLAY_DATA_DIR<br/>metadata.json · videos/ · thumbnails/)]
    N <-->|관리자 로그인| G[🔐 Google OAuth]
```

- 누구나 시청 가능: `/api/clips`(공개 클립만, 업로더 목록 미노출), `/media/*`(Range 지원, `immutable` 캐시 → 반복 시청은 Cloudflare Edge가 응답).
- 업로드·수정·삭제: `ADMIN_EMAILS`에 있는 Google 계정만. 매 요청마다 allowlist를 다시 확인한다.
- `metadata.json`은 `/media`로 절대 노출되지 않는다.

---

## 📁 프로젝트 구조

```
clipplay/
├── 📂 src/
│   ├── 📂 app/                    # Next.js App Router
│   │   ├── 📄 page.tsx            # 🏠 메인 (피드/그리드)
│   │   ├── 📂 memories/           # 💕 추억 모음
│   │   │   ├── 📄 page.tsx        # 필터 선택
│   │   │   └── 📂 play/           # 슬라이드쇼
│   │   ├── 📂 clip/[id]/          # 🎬 개별 영상 페이지
│   │   ├── 📂 admin/              # 🔐 관리자 영역
│   │   │   ├── 📄 page.tsx        # 대시보드
│   │   │   ├── 📂 login/          # Google 로그인
│   │   │   ├── 📂 upload/         # 업로드 페이지
│   │   │   └── 📂 clips/          # 영상 관리
│   │   └── 📂 api/                # ⚡ API 라우트 (Edge)
│   │       ├── 📂 auth/           # 인증 API
│   │       └── 📂 admin/          # 관리 API
│   ├── 📂 components/             # 🧩 React 컴포넌트
│   │   ├── 📂 player/             # 비디오 플레이어
│   │   ├── 📂 clip/               # 클립 관련 UI
│   │   └── 📂 ui/                 # 공통 UI
│   ├── 📂 hooks/                  # 🪝 커스텀 훅
│   ├── 📂 context/                # 🌐 React Context
│   ├── 📂 lib/                    # 🔧 유틸리티
│   │   ├── 📂 auth/               # 인증 로직
│   │   ├── 📂 storage/            # 로컬 디스크 저장소 (metadata·파일·경로 검증)
│   │   └── 📂 clips/              # 클립 필터링
│   └── 📂 types/                  # 📝 TypeScript 타입
├── 📂 public/                     # 정적 파일
│   ├── 📄 manifest.json           # PWA 매니페스트
│   └── 📄 sw.js                   # Service Worker
└── 📄 package.json
```

---

## 🔐 관리자 기능

### 📤 영상 업로드 워크플로우

```mermaid
sequenceDiagram
    participant C as 🖥️ 클라이언트
    participant A as ⚡ API (Mac mini)
    participant D as 💾 로컬 디스크

    C->>A: 1. POST /api/admin/presign (clipId·업로드 URL 예약)
    loop 32MB 청크
        C->>A: 2. PUT /api/admin/files/videos/<id>.mp4?offset&total
        A->>D: .part 파일에 append
    end
    A->>D: 3. 마지막 청크 → ffmpeg +faststart 후 원자적 rename
    C->>A: 4. POST /api/admin/upload (메타데이터)
    A->>D: 5. metadata.json 원자적 갱신 (.bak 보관)
```

청크 업로드는 Cloudflare 프록시의 요청 본문 100MB 제한 때문이다.

### ✅ 업로드 제한사항

| 항목 | 제한 |
|:---:|:---:|
| 📁 파일 크기 | `metadata.json`의 `settings.maxFileSizeMB` (기본 500MB) |
| 🎥 파일 형식 | video/* (MP4 권장) |
| 🖼️ 썸네일 | 자동 캡처 또는 직접 업로드 |
| 📅 촬영일 | 파일 수정일 자동 감지 |

---

## 💾 데이터 모델

### 📹 Clip (영상)

```typescript
interface Clip {
  id: string;              // 고유 ID
  title: string;           // 제목
  description?: string;    // 설명 (선택)
  emoji: string;           // 대표 이모지 🎬
  fileKey: string;         // videos/xxx.mp4
  fileSize: number;        // 파일 크기 (bytes)
  duration: number;        // 재생 시간 (초)
  thumbnailKey?: string;   // thumbnails/xxx.jpg
  filmingDate?: string;    // 촬영일 (YYYY-MM-DD)
  createdAt: string;       // 생성일시
  updatedAt: string;       // 수정일시
}
```

---

## 💻 로컬에서 실행하기

```bash
cp .env.example .env.local   # 값 채우기 (CLIPPLAY_DATA_DIR, JWT_SECRET, ADMIN_EMAILS, Google OAuth)
npm install
npm run dev
```

| 명령어 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run lint` | ESLint |
| `npm run test` | Vitest |
| `npm run build` | 프로덕션 빌드 |

---

## 🌍 배포 (Mac mini + Cloudflare Tunnel)

```bash
# Mac mini (.173)
cd /Volumes/sn850x/git/crispy-web && git pull
cd clipplay && npm ci && npm run build          # NEXT_PUBLIC_* 는 빌드 시점에 고정됨
pm2 startOrRestart ecosystem.config.cjs && pm2 save
```

- 서버 비밀값은 `clipplay/.env.local`(미추적)에 둔다. `NEXT_PUBLIC_BASE_URL=https://clipplay.zowoo.uk`.
- 데이터: `/Volumes/sn850x/clipplay-data` (`metadata.json`, `videos/`, `thumbnails/`).
- 재부팅 대비: `deploy/dev.clipplay.pm2.plist`를 `~/Library/LaunchAgents/`에 설치(파일 상단 주석 참고). 외장 볼륨이 마운트되면 pm2 앱을 띄운다.
- Tunnel: 기존 원격 관리형 tunnel에 `clipplay.zowoo.uk → http://127.0.0.1:5110` ingress, DNS는 `<tunnel-id>.cfargotunnel.com` CNAME.
- Google OAuth 클라이언트에 `https://clipplay.zowoo.uk/api/auth/callback` 리디렉션 URI가 등록돼 있어야 한다.
- 기존 영상의 moov atom 앞당기기(무손실): `scripts/faststart-all.sh /Volumes/sn850x/clipplay-data`.

---

## 🔒 보안

| 항목 | 구현 |
|:---:|:---|
| 🔐 **세션** | JWT (HS256, 7일 만료) |
| 🍪 **쿠키** | HttpOnly, Secure, SameSite |
| 👤 **권한** | 이메일 화이트리스트 |
| 📤 **업로드** | 관리자 세션 확인 후 청크 PUT, 키 형식 검증 |
| 🔑 **API 키** | 서버 사이드만 접근 가능 |

---

## 🎯 향후 개선 사항

- [ ] 🎵 배경음악/음소거 기억
- [ ] 📊 시청 통계 대시보드
- [ ] 🏷️ 태그 시스템
- [ ] 👨‍👩‍👧‍👦 가족 구성원별 필터
- [ ] 📱 네이티브 앱 (React Native)
- [ ] 🌍 다국어 지원

---

## 📄 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.

---

## 👨‍💻 만든 사람

**izowooi**

궁금한 점이나 제안사항이 있으시면 Issue를 남겨주세요! 💬

---

<div align="center">

**⭐ 이 프로젝트가 마음에 드셨다면 Star를 눌러주세요! ⭐**

Made with ❤️ for Family Memories

[🎬 지금 시작하기](https://clipplay.zowoo.uk/)

</div>
