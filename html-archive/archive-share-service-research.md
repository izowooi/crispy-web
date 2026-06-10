# Archive Share Service Research

## 작성 목적

로그인이 필요한 웹페이지 또는 향후 사라질 수 있는 웹페이지를 장기 보관(Archive)하고,
필요 시 팀원들과 공유할 수 있는 서비스 아이디어를 정리한다.

이 문서는 Vibe Coding, Claude Code, Codex, Cursor 등의 AI 개발 환경에 첨부하여
프로젝트 요구사항 문서(PRD) 및 기술 검토 자료로 활용할 수 있다.

---

# 아이디어 배경

평소 다양한 기술 문서, 유료 서비스, 회원 전용 콘텐츠를 접하게 된다.

문제는 다음과 같다.

## 문제 1

내가 보고 있는 페이지는 로그인 후 접근 가능하지만
팀원은 해당 계정을 가지고 있지 않을 수 있다.

따라서 해당 페이지를 공유하기 어렵다.

---

## 문제 2

현재 존재하는 사이트가

- 폐쇄
- 서비스 종료
- 도메인 만료
- 콘텐츠 삭제

등으로 인해 미래에는 접근 불가능해질 수 있다.

따라서 현재 보고 있는 콘텐츠를 장기 보관하고 싶다.

---

# 핵심 아이디어

"현재 내가 보고 있는 웹페이지를 영구적으로 보존한다."

사용자는 로그인된 상태로 페이지를 열람하고 있다.

즉,

브라우저에는 이미

- HTML
- CSS
- 이미지
- 텍스트

가 다운로드되어 존재한다.

이 상태를 저장하면 된다.

---

# 초기 접근 방법

## 방법 1

브라우저 기능 사용

### 절차

```text
우클릭
↓
다른 이름으로 저장
↓
HTML 저장
↓
업로드
↓
공유
```

---

### 장점

가장 구현이 쉽다.

MVP 검증용으로 적합하다.

---

### 단점

외부 의존성이 많다.

예를 들어

- CSS
- JS
- 이미지

가 분리 저장된다.

몇 년 뒤 다시 열었을 때 깨질 가능성이 존재한다.

---

# 방법 2

Chrome Extension 사용

### 절차

```text
사용자 클릭
↓
현재 페이지 DOM 분석
↓
이미지 수집
↓
HTML 생성
↓
업로드
```

---

### 장점

사용성이 좋다.

원클릭 저장 가능.

서비스화하기 가장 적합하다.

---

### 단점

확장 프로그램 개발 필요.

---

# 방법 3

콘텐츠 추출 방식

DOM에서

- 제목
- 본문
- 이미지

만 추출한다.

---

예시

```json
{
  "title": "문서 제목",
  "content": "...",
  "images": [
    "..."
  ]
}
```

---

### 장점

검색 가능

AI 분석 가능

벡터 검색 가능

---

### 단점

레이아웃 정보가 손실된다.

---

# ChatGPT 분석 결과

## 결론

기술적으로 충분히 가능하다.

오히려 이미 비슷한 서비스들이 존재한다.

대표 사례

- Pocket
- Instapaper
- SingleFile
- Wayback Machine
- Notion Web Clipper

---

# 가장 추천하는 방식

단일 방식보다

복합 저장 방식을 추천한다.

---

## 저장 구성

```text
archive/

├── page.html
├── content.json
├── metadata.json
├── screenshot.png
└── page.pdf
```

---

# 각 파일의 역할

## page.html

원본 페이지 최대한 복원

---

## content.json

검색

AI 요약

태그 생성

벡터 검색

---

## screenshot.png

HTML 복원 실패 시 최후의 백업

---

## page.pdf

인쇄 및 보관용

---

# HTML 저장 방식 검토

## 질문

그냥 HTML 저장 후 업로드하면 되지 않을까?

---

## 답변

MVP 단계에서는 가능하다.

하지만 서비스로 발전시키기에는 한계가 있다.

---

### 이유

일반 HTML 저장은

- 외부 CSS
- 외부 JS
- CDN 이미지

에 의존한다.

---

몇 년 후

```text
이미지 삭제
CSS 삭제
도메인 종료
```

가 발생하면 페이지가 깨질 수 있다.

---

# 더 좋은 방식

SingleFile 방식

---

SingleFile은

```text
HTML
+
CSS
+
이미지
```

를 하나의 HTML 파일 안에 내장한다.

---

예시

```html
<img src="data:image/png;base64,...">
```

---

### 장점

파일 하나만 보관

복원율 높음

장기 보관 적합

---

# 추천 아키텍처

## 구조

```text
Chrome Extension

↓
현재 페이지 수집

↓
HTML 정리

↓
이미지 내장

↓
JSON 생성

↓
서버 업로드

↓
공유 URL 생성
```

---

# 수집 대상

## 메타데이터

- URL
- 제목
- 캡처 시각
- 작성자

---

## 본문

- HTML
- 텍스트
- 코드 블록
- 링크

---

## 미디어

- 이미지
- 첨부파일

---

# 스크린샷 저장

Playwright 사용

```ts
await page.screenshot({
  fullPage: true
});
```

---

# PDF 저장

```ts
await page.pdf();
```

---

# AI 기능

저장 후

```text
페이지 저장

↓
OpenAI 호출

↓
요약 생성

↓
태그 생성

↓
카테고리 분류
```

---

# 검색 기능

## 기본 검색

- 제목
- URL

---

## 전문 검색

본문 전체 검색

---

## AI 검색

질문 기반 검색

예시

"Unity Addressables 관련 내용 보여줘"

---

# 서버 설계

## API

```text
POST /archive
GET /archive/:id
GET /archive/:id/raw
```

---

# 데이터베이스

Archive

```text
id
title
url
createdAt
```

---

ArchiveContent

```text
archiveId
html
json
pdf
screenshot
```

---

# 권장 기술 스택

## Frontend

- Next.js

---

## Browser Extension

- Manifest V3
- TypeScript

---

## Backend

- FastAPI

---

## Storage

- Supabase Storage

또는

- AWS S3

---

## Database

- PostgreSQL

---

## Search

- PostgreSQL Full Text Search

---

## AI

- OpenAI API

---

# MVP 범위

## V1

- Extension 설치
- 버튼 클릭
- HTML 저장
- URL 생성

---

## V2

- PDF 생성
- Screenshot 저장
- 검색

---

## V3

- AI 요약
- 태그
- 팀 공유

---

# 최종 기술 판단

## 우클릭 저장 방식

적합도: ★★☆☆☆

장점

- 구현 없음

단점

- 수동 작업
- 깨질 가능성 높음

---

## HTML 재구성 방식

적합도: ★★★★☆

장점

- 장기 보관 가능

단점

- 구현 필요

---

## Chrome Extension 방식

적합도: ★★★★★

장점

- UX 우수
- 자동화 가능
- 서비스 확장 가능

단점

- 초기 개발 비용 존재

---

# 최종 결론

권장 방향은 다음과 같다.

```text
Chrome Extension

+
SingleFile 스타일 HTML 생성

+
본문 JSON 추출

+
스크린샷 저장

+
서버 업로드

+
공유 URL 생성
```

이 방식은 단순한 HTML 저장 서비스가 아니라

"개인용 Wayback Machine"

또는

"팀용 지식 아카이브 플랫폼"

으로 발전시킬 수 있다.

---

# 추가 검토 사항
