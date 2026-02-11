# legal.md — Legal Pages (Terms + Privacy 통합 구조)

## 1. 목적

* Terms of Service 와 Privacy Policy를
  하나의 레이아웃 시스템으로 관리
* 언어 전환 가능 (한국어 / English)
* URL 분리 없이 내부 스위치 가능
* 미니멀, 가독성 중심 설계

---

## 2. 라우팅 구조

### Route 방식

예시:

* `/ko/privacy`
* `/en/privacy`

또는

* `/ko/terms`
* `/en/terms`

---

## 3. 페이지 구조

### 3.1 상단 영역

* H1: Terms of Service 또는 Privacy Policy
* Effective Date 표시 영역
* 언어 스위치
* 문서 스위치

---

## 4. 문서 스위치 (Tabs)

상단에 2개 탭

* Terms of Service
* Privacy Policy

UI 형태:

* underline active
* 매우 심플한 텍스트 탭
* border-bottom active

탭 전환 시:

* 페이지 리로드 없이 내용 교체
* scroll top 이동

---

## 5. 언어 스위치

위치:

* 우측 상단
* 또는 H1 옆

지원 언어:

* 한국어 (ko)
* English (en)

표현 방식:

* 텍스트 토글
  `EN | KR`
* 현재 선택 언어 강조

전환 방식:

* URL 쿼리 기반
* 예:

  * `ko/terms`
  * `en/terms`

---

## 6. 콘텐츠 영역

⚠️ 내용은 현재 비워둠

구조만 정의:

```
Section
  - H2
  - Paragraph
  - List
```

타이포 가이드:

* max-w-3xl
* line-height 충분히 확보
* 70ch 이하 가독성 유지

---

## 7. 로컬라이제이션 설계 가이드

### 권장 구조

```
/locales
  /en
    terms.json
    privacy.json
  /ko
    terms.json
    privacy.json
```

### 번역 키 예시

```
{
  "title": "",
  "effectiveDate": "",
  "sections": [
    {
      "heading": "",
      "content": ""
    }
  ]
}
```

---

## 8. 상태 관리 전략

* type: "terms" | "privacy"
* lang: "en" | "ko"

Next.js App Router에서:

* searchParams 활용 가능
* 또는 서버 컴포넌트에서 params 기반 처리

---

## 9. UX 원칙

* 문서 길이 길어도 읽기 편해야 함
* 배경색 흰색 고정
* 큰 박스/카드 사용 금지
* 강조는 bold 또는 border-left만

---

## 10. 접근성

* aria-selected 탭에 적용
* 키보드로 탭 이동 가능
* 언어 변경 시 focus 유지

---

## 11. Footer

전역 Footer 사용

```
© 2026 izowooi
Terms of Service
Privacy Policy
```

---

## 12. 완료 기준

* 한 페이지에서 Terms/Privacy 전환 가능
* 한 페이지에서 언어 전환 가능
* 모바일/데스크탑 모두 가독성 유지
* 내용은 JSON 기반으로 교체 가능
* URL로 직접 접근 가능
