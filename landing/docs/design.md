# design.md — izowooi Design System (Minimal / Modern)

## 1. 디자인 목표

* 모바일/데스크탑 모두에서 **절제된 미니멀리즘**
* 과한 장식, 과한 컬러, 과한 애니메이션 금지
* 콘텐츠 중심
* 여백 기반 레이아웃
* 타이포그래피 중심 디자인

---

## 2. 디자인 키워드

* Minimal
* Modern
* Calm
* Structured
* Product-focused

---

## 3. 컬러 시스템

### Base

* Background: `#FFFFFF`
* Text Primary: `#111111`
* Text Secondary: `#666666`
* Border: `#E5E5E5`

### Accent (선택 1개만 사용)

* Neutral Blue: `#2563EB`
* 또는 Black Only (완전 모노톤 전략 가능)

⚠️ 그라디언트, 강한 채도, 과한 그림자 금지

---

## 4. 타이포그래피

### 폰트 권장

* Inter
* 또는 Geist / SF 계열

### 계층 구조

#### H1

* `text-3xl md:text-4xl`
* `font-semibold`
* `tracking-tight`

#### H2

* `text-2xl md:text-3xl`
* `font-medium`

#### Body

* `text-base`
* `leading-relaxed`
* `text-neutral-700`

#### Small

* `text-sm`
* `text-neutral-500`

---

## 5. 레이아웃 규칙

### Container

```
max-w-5xl mx-auto px-4 sm:px-6 lg:px-8
```

### Section Spacing

```
py-12 md:py-16 lg:py-20
```

### Grid 규칙

* Mobile: 1열
* Tablet: 2열
* Desktop: 2~3열 최대

⚠️ 4열 이상 사용 금지

---

## 6. 버튼 디자인

### Primary Button

* bg-black
* text-white
* rounded-md
* hover: opacity 90%
* transition 최소

### Secondary

* border
* text-black
* bg-transparent

⚠️ 큰 그림자, 라운드 과다 사용 금지

---

## 7. 카드 디자인

* border only
* shadow 없음 또는 매우 약함
* padding `p-6`
* hover 시 background 약하게 변화

---

## 8. 모바일 기준 원칙

* 터치 영역 최소 44px
* 여백 충분히 유지
* 메뉴는 심플 드로어
* 불필요한 장식 요소 제거

---

## 9. 데스크탑 기준 원칙

* 넓은 여백
* 최대 width 제한
* 텍스트 길이 65~75ch 유지
* 콘텐츠 중앙 정렬

---

## 10. 애니메이션

* 150~200ms
* opacity / translateY 정도만
* 스크롤 기반 복잡 애니메이션 금지

---

## 11. 철학

> “Less UI, More Clarity.”

* 장식 대신 구조
* 컬러 대신 타이포
* 애니메이션 대신 여백
