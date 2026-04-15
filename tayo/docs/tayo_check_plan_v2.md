# 타요 체크

**카풀 커뮤니케이션 웹앱 기획서**

v2.0 | 2026.04

---

## 1. 서비스 개요

### 1.1 서비스명 (가칭)

타요 체크 (Tayo Check)

### 1.2 서비스 목적

- 카풀 이용 시 반복 커뮤니케이션 최소화
- "내일 타나요?", "출발했나요?" 같은 반복 질문 제거
- 상태 체크만으로 정보 전달

### 1.3 타겟 사용자

운전자 1명 + 탑승자 1명 (1:1 카풀). 향후 다수 탑승자 확장 고려.

---

## 2. 핵심 컨셉

> **말하지 않아도 상태가 전달되는 카풀 앱**

- **탑승자 →** "오늘 타요(출근해요)", "엘베 내려가요"
- **운전자 →** "오늘 출근해요", "확인했어요", "엘베 내려가요"
- **미체크 →** "오늘 출근해요" 메시지를 특정 시간까지 (09:00am) 미 입력시 "안 타요" 자동 간주

---

## 3. 사용자 구성

| 구분 | 운전자 | 탑승자 |
|------|--------|--------|
| 역할 | 파티 생성 / 초대 / 상태 확인 | 링크 참여 / 탑승 체크 |
| 식별 | 닉네임 입력 + localStorage 유지 | 닉네임 입력 + localStorage 유지 |
| 인증 | 없음 (초대 URL 기반 접근) | 없음 (초대 URL 기반 접근) |

---

## 4. 주요 기능

### 4.1 파티 생성 및 초대

- 운전자가 파티 생성 시 hash 기반 고유 URL 자동 생성
- URL 공유로 탑승자 초대 (별도 계정 불필요)
- 파티 생성 시 닉네임 입력 필수 (localStorage에 저장)

### 4.2 탑승 체크

- 탑승자 and 운전자: "오늘 타요(출근해요)" 버튼 클릭
- 운전자 : "확인했어요" 버튼 클릭
- 탑승자 and 운전자: "이제 엘베 내려가요" 로 진행
- 양쪽다 엘베 내려가요로 진행했다면 이제 만나서 타면 됨.
- 이런 Flow 를 FSM 으로 하면 제일 깔끔할 거 같다는 생각이 듭니다.

### 4.3 운전자 확인

- "확인했어요" 버튼으로 탑승자 상태 확인 응답
- 탑승자는 운전자 확인 여부를 UI에서 실시간 확인

### 4.4 상태 흐름 (State Flow)

| 단계 | 상태 | 트리거 | 보이는 정보 |
|------|------|--------|-------------|
| 1 | PENDING | 자정 자동 리셋 | "아직 체크 전" |
| 2 | RIDING | 탑승자 체크 | "오늘 타요" |
| 3 | CONFIRMED | 운전자 확인 | "확인됨" |
| 4 | NOT_RIDING | Deadline 경과 / 취소 | "오늘 안 타요" |

---

## 5. 일일 운영 사이클

### 5.1 운영 패턴

- **카풀 패턴:** 평일 매일 (월~금 고정)
- **체크 리셋:** 매일 자정 (00:00) 자동
- **Deadline:** 운전자가 파티 생성 시 설정 (예: 오전 7:30)

### 5.2 일일 타임라인

1. **00:00** — 전날 체크 자동 리셋, 상태 PENDING으로 초기화
2. **아침** — 탑승자가 앱 열고 "오늘 타요" 체크
3. **Deadline** — 미체크 시 NOT_RIDING 자동 전환
4. **확인** — 운전자가 상태 확인 후 출발

---

## 6. 기술 스택

| 영역 | 기술 | 비고 |
|------|------|------|
| Frontend | Next.js (App Router) | PWA 지원, SSR/SSG |
| Backend / DB | Supabase (PostgreSQL) | Realtime Subscription 활용 |
| Auth | 없음 (Anonymous) | 닉네임 + localStorage + Supabase row |
| Hosting | Vercel | Next.js 최적화 배포 |
| Push 알림 | Web Push API (향후) | Service Worker 기반 |

---

## 7. 데이터 모델

### 7.1 parties 테이블

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | UUID v4 자동 생성 |
| invite_code | text (unique) | URL 경로에 사용되는 hash 코드 (nanoid) |
| driver_name | text | 운전자 닉네임 |
| deadline_time | time | 탑승 체크 Deadline (예: 07:30) |
| created_at | timestamptz | 파티 생성 시각 |

### 7.2 daily_checks 테이블

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | UUID v4 자동 생성 |
| party_id | uuid (FK) | parties.id 참조 |
| check_date | date | 체크 대상 날짜 (KST 기준) |
| rider_status | text | PENDING \| RIDING \| NOT_RIDING |
| driver_confirmed | boolean | 운전자 확인 여부 (default: false) |
| checked_at | timestamptz | 탑승자 체크 시각 (nullable) |
| confirmed_at | timestamptz | 운전자 확인 시각 (nullable) |

### 7.3 members 테이블

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | UUID v4 자동 생성 |
| party_id | uuid (FK) | parties.id 참조 |
| nickname | text | 사용자 닉네임 |
| role | text | DRIVER \| RIDER |
| device_token | text | localStorage 식별 토큰 (UUID) |

---

## 8. 데이터 정책

- **보존 기간:** daily_checks 레코드 30일 후 자동 삭제 (Supabase pg_cron)
- **조회 범위:** 오늘 / 어제 (클라이언트 측 필터링)
- **리셋:** 매일 00:00 KST 자동 리셋 (Supabase Edge Function + pg_cron)
- **주말/공휴일:** 토요일 및 공휴일에는 체크 레코드 생성하지 않음 (평일만 운영)

---

## 9. UX/UI 방향

### 9.1 설계 원칙

- 클릭 1~2번으로 모든 작업 완료
- 모바일 퍼스트 디자인 (iPhone / Android 모두 대응)
- PWA 지원으로 홈 화면 추가 가능
- 상태별 색상 구분 (체크=초록, 미체크=회색, 안타요=빨간)

### 9.2 화면 구성

| 화면 | 설명 |
|------|------|
| `/` | 랜딩 페이지 — 파티 생성 버튼 |
| `/join/[code]` | 초대 링크 — 닉네임 입력 후 파티 참여 |
| `/party/[code]` | 메인 대시보드 — 오늘의 체크 상태 + 버튼 |

---

## 10. 시스템 특징

- **무인증:** 로그인 없음. 초대 코드를 아는 누구나 접근 가능
- **URL 기반:** 모든 접근은 URL로 이루어짐 (PWA 홈 화면 추가 지원)
- **Realtime:** Supabase Realtime Subscription으로 상태 변경 즉시 반영
- **초경량:** 최소한의 테이블, 최소한의 API
- **향후 확장:** 다수 탑승자 지원, Push 알림 추가 예정

---

## 11. 향후 로드맵

| 단계 | 기능 | 설명 |
|------|------|------|
| v1.0 | 핵심 기능 | 파티 생성, 체크, 확인, Realtime, PWA |
| v1.1 | Push 알림 | Web Push API 기반 체크 리마인더 / 상태 변경 알림 |
| v1.2 | 다수 탑승자 | 1:N 카풀 지원, 탑승자 목록 UI |
| v2.0 | 운전자 출발 상태 | "출발했어요" 버튼 추가, 도착 예상 시간 표시 |
