# izowooi Landing (Dream Games 클론 기반) — 기획서 (Markdown)

## 1) 목표 / 범위

* Dream Games 메인 랜딩 페이지의 **레이아웃/섹션 흐름/정보 구조**를 참고하여 izowooi 브랜드용 랜딩으로 구현한다. ( https://www.dreamgames.com/ )
* **헤더/푸터 구조는 유지**하되, 콘텐츠는 프로젝트 요구사항에 맞게 단순화한다.
* **메인 화면은 더미 데이터**(이미지/텍스트/카드/리스트)로 구성한다.
* 이미지 혹은 이미지 카드가 필요한 경우 프롬프트를 제시해주세요.
* 이미지는 이미 있다고 가정하고 코드를 작성합니다.
* 반응형(모바일/태블릿/데스크탑)에서 좋은 UX를 제공한다.

---

## 2) 기술 스택 / 구현 원칙

### Tech

* Next.js (App Router)
* Tailwind CSS
* (권장) TypeScript, ESLint/Prettier
* (권장) next/font로 폰트 적용, next/image로 이미지 최적화

### UI 원칙

* **모바일 퍼스트**: 기본은 세로 스택, 큰 화면에서 그리드/양쪽 배치
* **접근성**: 버튼/링크 포커스 스타일, 명확한 대비, alt 텍스트
* **일관성**: 동일한 spacing scale, 동일한 카드 스타일, 동일한 CTA 스타일

---

## 3) 사이트맵 / 라우팅

### Routes

* `/` : Main Landing
* `/about-me` : About me (about-me.md)
* `/apps` : Apps (apps.md)
* `/terms` : Terms of Service (legal.md)
* `/privacy` : Privacy Policy (legal.md)

> **Careers 라우트는 만들지 않음**

---

## 4) 전역 레이아웃 구조

### 공통 레이아웃

* `Header`
* `Main (page content)`
* `Footer`

### Header (요구사항 반영)

* 좌측: 로고(텍스트 로고 “izowooi” 추후 심볼 이미지로 교체 예정)
* 우측 네비게이션:

  * About us → **About me** (`/about-me`)
  * Games → **Apps** (`/apps`)
  * Careers → **제거**
* 모바일:

  * 햄버거 메뉴(드로어/슬라이드) 또는 간단한 드롭다운
  * 탭 영역 크기(최소 44px) 확보

### Footer (요구사항 반영: 단순화)

* 가운데 정렬: `Terms of Service` / `Privacy Policy` 링크만
* 그 아래에: `© 2026 izowooi`
* SNS/이메일/추가 링크/언어 선택 등 **모두 제거**

---

## 5) 메인 페이지 정보 구조 (섹션 구성)

Dream Games 메인의 흐름을 참고하되, 브랜드에 맞게 더미로 구성.

### 5.1 Hero Section

**목적**

* 첫 화면에서 브랜드 톤/핵심 가치 제시 + 주요 CTA 제공

**구성 요소**

* 좌측(텍스트 영역)

  * 헤드라인(더미): “Build delightful experiences.”
  * 서브카피(더미): “I craft playful digital products with a focus on quality and longevity.”
  * CTA 버튼 2개:

    * Primary: “Explore Apps” → `/apps`
    * Secondary: “Learn more” → `/about-me`
* 우측(비주얼 영역)

  * 메인 키비주얼(더미 이미지)
  * 배경 장식용 그래픽(선택, 성능 부담 적게)

**반응형**

* Mobile: 텍스트 위 / 이미지 아래(세로 스택)
* Desktop: 좌 텍스트 / 우 이미지(2컬럼), 세로 정렬 중앙

---

### 5.2 About Preview Section

**목적**

* About me로 이동시키는 “티저” 섹션

**구성 요소**

* 섹션 타이틀: “ABOUT ME”
* 2~3줄 소개(더미)
* 보조 이미지(더미) 또는 일러스트 카드
* 링크/버튼: “Learn More” → `/about-me`

**반응형**

* Mobile: 텍스트 + 카드 1열
* Desktop: 텍스트/이미지 2열 또는 카드형 배치

---

### 5.3 Apps Showcase Section

**목적**

* Apps 리스트(더미)를 카드 형태로 보여주고 `/apps`로 유도

**구성 요소**

* 섹션 타이틀: “APPS”
* 섹션 설명(더미): “High-quality apps designed for everyday joy.”
* 앱 카드 리스트(더미 2~4개)

  * 카드 요소: 썸네일, 앱명, 한 줄 설명, 태그(예: “Productivity”, “Tool”, “Game” 더미), CTA 링크
  * 카드 클릭 시 `/apps` 또는 (추후) `/apps/[slug]`로 확장 가능
* 하단 CTA: “Explore Apps” → `/apps`

**반응형**

* Mobile: 1열 카드
* Tablet: 2열 카드
* Desktop: 3열 카드(최대 4열은 지양)

---

### 5.4 Culture / Values Section (Careers 대체 목적)

Dream Games 메인에서 Careers 섹션이 담당하던 “팀/문화/가치” 느낌을,
Careers 없이도 전달할 수 있도록 **Values** 섹션으로 대체.

**구성 요소**

* 섹션 타이틀: “VALUES”
* 3~4개 가치 카드(더미)

  * 예: Craft, Clarity, Playfulness, Ownership
  * 아이콘(선택) + 짧은 설명
* CTA(선택): “About me”로 유도

**반응형**

* Mobile: 1열 스택
* Desktop: 3~4열 그리드

---

### 5.5 Final CTA Section

**목적**

* 페이지 마지막에서 명확한 행동 유도

**구성 요소**

* 문구(더미): “Want to see what I’m building?”
* 버튼:

  * Primary: “Explore Apps”
  * Secondary: “About me”

---

## 6) 더미 데이터 정책

### 더미 이미지

* 로컬 에셋(`/public`)에 3~5개 준비:

  * hero-kv.jpg / about-preview.jpg / app-thumb-*.jpg
* 이미지가 없을 경우 그라디언트/플레이스홀더(스켈레톤)로 대체

### 더미 텍스트 & 앱 목록 예시(설계)

* 앱 데이터는 `data/apps.ts` 또는 `content/apps.json`에 정의
* 필드:

  * `id`, `name`, `tagline`, `category`, `image`, `tags[]`, `href`
* 메인에서는 상위 N개만 노출 (예: 3개)

---

## 7) 컴포넌트 설계 (권장)

### Layout

* `Header`
* `Footer`
* `Container` (max-width + padding)
* `Section` (공통 섹션 spacing)

### UI

* `Button` (primary/secondary)
* `NavLink`
* `Card` (AppCard / ValueCard)
* `Badge` (태그)

### Page Sections

* `HeroSection`
* `AboutPreviewSection`
* `AppsShowcaseSection`
* `ValuesSection`
* `FinalCTASection`

---

## 8) 반응형/레이아웃 가이드 (Tailwind 기준)

* 최대 폭: `max-w-6xl` 또는 `max-w-7xl`
* 좌우 패딩: `px-4 sm:px-6 lg:px-8`
* 섹션 여백: `py-12 md:py-16 lg:py-20`
* 카드 그리드:

  * `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6`

---

## 9) 인터랙션/UX

* 헤더 네비게이션:

  * 데스크탑: 인라인 메뉴
  * 모바일: 메뉴 토글(드로어)
* 스크롤 시 헤더:

  * (선택) sticky + 배경 블러/섀도우로 가독성 유지
* CTA 버튼:

  * hover/active/focus 상태 정의
* 링크 접근성:

  * focus ring 명확히 표시

---

## 10) SEO / 메타(최소)

* `/` 페이지:

  * title: “izowooi”
  * description: “Izowooi landing page”
* OG 이미지(더미) 설정 가능

---

## 11) 이번 단계 완료 기준 (Done Definition)

* `/` 메인 페이지가 섹션 구조대로 렌더링된다.
* Header:

  * About me, Apps 링크가 정상 이동
  * Careers 없음
* Footer:

  * `© 2026 izowooi` + `Terms of Service` + `Privacy Policy`만 존재
* 모바일/데스크탑에서 레이아웃 깨짐 없이 자연스럽게 보인다.
* 메인 콘텐츠는 더미 데이터로 채워져 있고, 이미지가 없어도 플레이스홀더로 UX가 유지된다.
