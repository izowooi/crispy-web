# apps.md — izowooi Apps Page 기획서 (Dream Games /games 구조 참고)

## 1) 목적 / 포지션

* “우리의 앱 2개”를 **깔끔한 정보 구조**로 소개하는 리스트형 페이지
* 과한 장식/긴 카피 없이 **미니멀 + 제품 중심**으로 신뢰감 제공
* 앱스토어/구글플레이(또는 웹 링크)로 자연스럽게 이동 유도

---

## 2) 라우팅 / 접근

* Route: `/apps`
* Header/Footers: `home.md`의 전역 레이아웃을 그대로 사용

  * Header: `About me` / `Apps`
  * Footer: `© 2026 izowooi` + `Terms of Service` + `Privacy Policy`

---

## 3) 페이지 정보 구조 (Sections)

Dream Games Games 페이지의 흐름을 유지하되, 미니멀하게 축소

### 3.1 Hero (페이지 상단)

**목적**

* 페이지 주제(Our Apps)와 짧은 소개를 한 번에 전달

**구성 요소**

* H1: `Apps`
* Subcopy(더미, 1~2줄):

  * 예: “Two focused products, built with care.”
* (선택) 아주 절제된 히어로 비주얼

  * 단색/그라디언트 배경 + 심플한 형태(이미지 없이도 성립)
  * Dream Games처럼 큰 일러스트를 쓰고 싶다면 “저채도 1장” 정도만

**반응형**

* Mobile: 텍스트 중심 (비주얼은 아래 또는 생략)
* Desktop: 여백을 넉넉히 (max-w 제한 + 중앙 정렬)

---

### 3.2 Apps List (2개 앱 섹션)

**목적**

* 2개 앱을 “동일한 구조의 카드/행(row)”로 소개
* Learn More 버튼 없이도 스토어 배지/링크로 바로 전환

**표현 방식 (미니멀 추천)**

* 방식 A: **Row Layout (추천)**

  * 좌: 앱 대표 이미지(또는 로고 썸네일)
  * 우: 앱명 + 1줄 설명 + 배지/링크(스토어)
* 방식 B: Card Grid

  * 2개 카드만 보여도 되며, 데스크탑에서 2열, 모바일 1열

**앱 아이템 공통 구성**

* App Visual

  * `next/image` 사용 (없으면 placeholder)
* App Name (H2)
* Tagline (1~2줄)
* Links

  * App Store badge (optional)
  * Google Play badge (optional)
  * (또는) “Open” 단일 링크 1개로 단순화 가능
* **Learn More 제거 (요구사항)**

**반응형**

* Mobile: 1열 + 세로 스택
* Tablet/Desktop:

  * Row Layout이면 이미지/텍스트 2열
  * 또는 2열 그리드(카드)

---

### 3.3 (선택) Minimal Footer CTA

**목적**

* 페이지 마지막에서 한 번 더 “둘 중 하나를 설치/열기” 유도

**구성 요소**

* 한 줄 카피(더미): “Try them and tell me what you think.”
* 링크 2개(텍스트 링크 형태로 매우 미니멀하게)

  * “App A on App Store”
  * “App B on Google Play”
* 버튼은 생략 가능 (미니멀 유지)

---

## 4) 더미 데이터 정책 (필수)

이번 페이지는 앱이 2개로 고정이므로, 더미 데이터는 “구조만” 유지하고 실제 값은 교체 가능하게 설계

### 데이터 위치

* `data/apps.ts` (권장) 또는 `content/apps.json`

### 필드 스키마(권장)

* `id`: string
* `name`: string
* `tagline`: string
* `descriptionShort`(optional): string
* `image`: string (public path)
* `links`:

  * `appStoreUrl`(optional)
  * `googlePlayUrl`(optional)
  * `webUrl`(optional)

> 스토어 링크가 아직 없으면 더미 URL로 두고, UI는 “없으면 숨김” 처리

---

## 5) 컴포넌트 설계 (권장)

* `AppsHero`
* `AppRow` 또는 `AppCard`
* `AppsList`
* (선택) `AppsCTA`

### AppRow (미니멀 UI 가이드)

* 좌측 썸네일: 정사각형 또는 4:3 비율
* 우측 텍스트: name + tagline
* 링크 영역: 배지 1~2개 or 텍스트 링크 1~2개
* hover 효과: 아주 약한 border/배경 변화(과한 애니메이션 금지)

---

## 6) Tailwind 레이아웃 가이드 (미니멀)

* Container: `max-w-5xl mx-auto px-4 sm:px-6 lg:px-8`
* 섹션 패딩: `py-12 md:py-16`
* 타이포:

  * H1: `text-3xl md:text-4xl font-semibold tracking-tight`
  * Subcopy: `text-base md:text-lg text-muted`(색상은 토큰화 권장)
* 앱 리스트:

  * Row: `grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 md:gap-10`
  * 구분선: `border-t` 또는 각 아이템 `border-b`로 정갈하게

---

## 7) 인터랙션 / UX

* 네비게이션:

  * `/apps` 활성 상태 표시(underline 또는 텍스트 강조)
* 링크:

  * 배지/텍스트 링크 모두 키보드 포커스 링 제공
* 성능:

  * 이미지 lazy-load
  * 섹션 수 적게 유지

---

## 8) 완료 기준 (Done Definition)

* `/apps` 페이지가 Hero + Apps List(2개) 구조로 노출된다.
* 각 앱은 동일한 레이아웃/컴포넌트로 표현된다.
* “Learn More” 요소는 없다.
* 모바일/데스크탑에서 여백/가독성이 무너지지 않고 미니멀하게 유지된다.
* 앱 스토어/구글플레이 링크는 존재하는 것만 노출된다(없으면 숨김).
