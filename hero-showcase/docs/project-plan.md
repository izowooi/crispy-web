# Hero Card Showcase - 프로젝트 계획서

## 1. 프로젝트 개요

판타지 캐릭터 카드를 갤러리 형태로 감상할 수 있는 웹 애플리케이션.
사용자는 캐릭터 HTML 파일, webp 초상화 이미지, 영웅 이름을 업로드하고,
업로드된 영웅들을 갤러리에서 탐색하거나 상세 카드를 열람할 수 있다.

## 2. 기술 스택

| 영역 | 기술 | 비고 |
|------|------|------|
| Frontend | Next.js (App Router) + Tailwind CSS | SSG/ISR 활용 |
| Backend / DB | Supabase (PostgreSQL + Storage) | 파일 저장 및 메타데이터 관리 |
| 배포 | Cloudflare Pages | `@cloudflare/next-on-pages` 활용 |
| 인증 | 없음 | 누구나 업로드/조회 가능 |

## 3. 핵심 기능

### 3.1 갤러리 페이지 (`/`)

갤러리는 업로드된 영웅 카드를 그리드 형태로 나열한다. 각 카드는 **미니 카드** 형태로 표시된다.

**미니 카드 구성 요소:**
- webp 초상화 이미지 (썸네일)
- 영웅 이름
- 레어리티 뱃지 (HTML에서 추출한 rarity 정보)
- 직업/칭호 (간략 정보)

**기능:**
- 반응형 그리드 레이아웃 (모바일 1열, 태블릿 2열, 데스크톱 3~4열)
- 카드 클릭 시 상세 페이지로 이동
- 로딩 스켈레톤 UI

### 3.2 상세 페이지 (`/heroes/[id]`)

기존에 생성된 캐릭터 HTML 파일을 **iframe으로 그대로 렌더링**한다.

**기능:**
- iframe을 통한 원본 HTML 카드 렌더링
- iframe 높이 자동 조절 (콘텐츠에 맞춤)
- 이전/다음 영웅으로 넘기기 (좌우 네비게이션)
- 목록으로 돌아가기 버튼
- 키보드 네비게이션 지원 (← → 화살표, ESC로 목록 복귀)

### 3.3 업로드 페이지 (`/upload`)

새로운 영웅 카드를 등록하는 폼.

**업로드 필드:**
- 영웅 이름 (텍스트 입력)
- 캐릭터 HTML 파일 (`.html` 파일 업로드)
- 초상화 이미지 (`.webp` 파일 업로드)

**처리 흐름:**
1. 사용자가 폼 작성 후 제출
2. webp 이미지 → Supabase Storage `portraits/` 버킷에 업로드
3. HTML 파일 → Supabase Storage `cards/` 버킷에 업로드
4. 메타데이터(이름, 파일 경로, rarity 등) → Supabase DB `heroes` 테이블에 INSERT
5. 업로드 완료 후 해당 영웅의 상세 페이지로 리다이렉트

## 4. 데이터 모델

### Supabase DB - `heroes` 테이블

```sql
CREATE TABLE heroes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,                    -- 영웅 이름
  title       TEXT,                             -- 칭호
  job         TEXT,                             -- 직업
  rarity      TEXT DEFAULT 'common',            -- common, rare, heroic, legendary, mythic
  portrait_url TEXT NOT NULL,                   -- Supabase Storage 내 webp 경로
  card_url    TEXT NOT NULL,                    -- Supabase Storage 내 HTML 경로
  metadata    JSONB,                            -- CHARACTER_DATA JSON 원본 (검색/필터용)
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_heroes_rarity ON heroes(rarity);
CREATE INDEX idx_heroes_created_at ON heroes(created_at DESC);
```

### Supabase Storage 버킷

| 버킷명 | 용도 | 접근 정책 |
|--------|------|-----------|
| `portraits` | webp 초상화 이미지 | Public read |
| `cards` | 캐릭터 HTML 파일 | Public read |

## 5. 페이지 구조 및 라우팅

```
app/
├── layout.tsx              # 공통 레이아웃 (헤더, 다크모드 토글)
├── page.tsx                # 갤러리 (메인 페이지)
├── heroes/
│   └── [id]/
│       └── page.tsx        # 영웅 상세 (iframe 렌더링)
├── upload/
│   └── page.tsx            # 업로드 폼
└── api/
    └── heroes/
        ├── route.ts        # GET (목록) / POST (업로드)
        └── [id]/
            └── route.ts    # GET (단건 조회) / DELETE (삭제)
```

## 6. UI/UX 설계

### 6.1 갤러리 레이아웃

```
┌─────────────────────────────────────────────┐
│  🏰 Hero Showcase          [업로드] [🌙/☀️]  │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐   │
│  │ 초상화 │  │ 초상화 │  │ 초상화 │  │ 초상화 │   │
│  │      │  │      │  │      │  │      │   │
│  │ 이름  │  │ 이름  │  │ 이름  │  │ 이름  │   │
│  │ 칭호  │  │ 칭호  │  │ 칭호  │  │ 칭호  │   │
│  │[rare] │  │[myth]│  │[hero]│  │[comm]│   │
│  └──────┘  └──────┘  └──────┘  └──────┘   │
│                                             │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐   │
│  │ ...  │  │ ...  │  │ ...  │  │ ...  │   │
│  └──────┘  └──────┘  └──────┘  └──────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

### 6.2 상세 페이지 레이아웃

```
┌─────────────────────────────────────────────┐
│  ← 목록으로     영웅이름      ← prev  next → │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │                                     │    │
│  │     기존 캐릭터 카드 HTML            │    │
│  │     (iframe 렌더링)                 │    │
│  │                                     │    │
│  │                                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

### 6.3 업로드 페이지

```
┌─────────────────────────────────────────────┐
│  ← 목록으로        새 영웅 등록              │
├─────────────────────────────────────────────┤
│                                             │
│  영웅 이름: [___________________________]   │
│                                             │
│  초상화 이미지 (.webp):                      │
│  ┌─────────────────────┐                    │
│  │  📁 파일을 드래그하거나  │                    │
│  │     클릭하여 선택      │                    │
│  └─────────────────────┘                    │
│                                             │
│  캐릭터 카드 (.html):                        │
│  ┌─────────────────────┐                    │
│  │  📁 파일을 드래그하거나  │                    │
│  │     클릭하여 선택      │                    │
│  └─────────────────────┘                    │
│                                             │
│  [미리보기]           [등록하기]              │
│                                             │
└─────────────────────────────────────────────┘
```

## 7. 주요 컴포넌트

| 컴포넌트 | 설명 |
|----------|------|
| `HeroGrid` | 갤러리 그리드 레이아웃 |
| `HeroMiniCard` | 미니 카드 (썸네일 + 이름 + 레어리티) |
| `HeroDetailViewer` | iframe 기반 HTML 카드 뷰어 |
| `HeroNavigation` | 이전/다음/목록 네비게이션 바 |
| `UploadForm` | 드래그앤드롭 업로드 폼 |
| `FileDropZone` | 파일 드래그앤드롭 영역 |
| `ThemeToggle` | 다크모드/라이트모드 전환 |
| `Header` | 공통 상단 헤더 |

## 8. 업로드 시 메타데이터 추출

업로드된 HTML 파일에서 `CHARACTER_DATA` JSON을 파싱하여 DB에 저장한다.
이를 통해 갤러리에서 rarity 뱃지, 직업, 칭호 등을 별도 입력 없이 자동으로 표시할 수 있다.

```
HTML 파일 업로드
  → 서버에서 정규식으로 CHARACTER_DATA 추출
  → JSON 파싱
  → name, title, job, rarity 등을 heroes 테이블에 저장
  → metadata 컬럼에 전체 JSON 보관
```

## 9. 구현 순서

### Phase 1: 기반 구축
1. Next.js 프로젝트 초기화 (Tailwind CSS 설정)
2. Supabase 프로젝트 연결 (환경변수 설정)
3. DB 테이블 및 Storage 버킷 생성
4. 공통 레이아웃 및 헤더 구현

### Phase 2: 업로드 기능
5. 업로드 폼 UI 구현 (드래그앤드롭)
6. 파일 업로드 API 구현 (Storage 연동)
7. HTML 파싱 → 메타데이터 추출 로직
8. 업로드 완료 흐름 (성공/실패 처리)

### Phase 3: 갤러리 & 상세
9. 갤러리 페이지 구현 (미니 카드 그리드)
10. 상세 페이지 구현 (iframe 렌더링)
11. 이전/다음 네비게이션
12. 키보드 네비게이션

### Phase 4: 마무리
13. 다크모드 지원
14. 반응형 최적화
15. Cloudflare Pages 배포 설정
16. 최종 테스트

## 10. 환경 변수

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## 11. 제약 사항 및 고려 사항

- **파일 크기 제한**: 캐릭터 HTML 파일이 base64 이미지를 포함하여 대용량일 수 있음 (수 MB). Supabase Storage 무료 플랜 1GB 한도 고려.
- **iframe 보안**: 업로드된 HTML을 iframe으로 렌더링할 때 `sandbox` 속성 적용으로 스크립트 실행 범위 제한.
- **CORS**: Supabase Storage의 public 접근 시 CORS 설정 확인 필요.
- **Cloudflare Pages 호환**: Next.js Edge Runtime 사용, Node.js API는 제한적이므로 Route Handler에서 edge runtime 활용 또는 Supabase client-side SDK 직접 호출 고려.
