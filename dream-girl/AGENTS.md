# AGENTS.md — AI Coding Agent & Developer Guidelines

이 문서는 **MUSE CUP : 이상형 월드컵 (`dream-girl-world-cup`)** 프로젝트를 이어받아 작업하는 AI 에이전트(Antigravity, Claude Code, Cursor, Codex 등)와 개발자를 위한 핵심 지침서입니다.

---

## 1. 프로젝트 개요 (Project Overview)

- **프로젝트명**: `MUSE CUP : 이상형 월드컵 — Chronicles & Romance`
- **목적**: 한국 로맨스 판타지 웹툰(로판) 및 현대 청춘 애니메이션 화풍의 일러스트와 깊이 있는 캐릭터 서사(이름, 칭호, 소속, 배경 장소, 시그니처 대사, 배경 스토리, 히든 시크릿 노트, 5대 매력 스탯)를 결합한 인터랙티브 이상형 월드컵 웹 애플리케이션.
- **연출 레퍼런스**: [prompt-motion.com](https://prompt-motion.com/)의 모션 그래픽 및 인터랙션 철학 적용
  - 키네틱 타이포그래피 라운드 전환 (`KineticRoundIntro`)
  - 스프링 물리(Spring Physics) 기반 3D 원근 틸트 및 스페큘러 광원(Rim/Key Glare) 카드 (`CharacterCard`)
  - 대결 중인 두 캐릭터의 테마 컬러에 실시간 반응하는 듀얼 키라이트 캔버스 (`AmbientStageCanvas`)
  - 외부 오디오 파일 의존성 없이 Web Audio API 코드로 실시간 합성되는 프로시저럴 사운드 & BGM 엔진 (`soundEngine`)

---

## 2. 기술 스택 (Tech Stack)

- **Runtime / Bundler**: Vite 6 (`^6.2.0`)
- **UI Framework**: React 19 (`^19.0.0`) + TypeScript (`~5.7.2`)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`) + Custom CSS Utilities (`src/index.css`)
- **Animation**: `framer-motion` (`^12.4.7`) + HTML5 Canvas 2D + `canvas-confetti`
- **Icons**: `lucide-react`
- **Audio**: Native Browser `AudioContext` (Web Audio API procedural synthesizer)
- **Persistence**: Browser `localStorage` (`dream-girl-world-cup-stats-v1`)

---

## 3. 디렉토리 및 파일 구조 (Directory Structure)

```text
dream-girl-world-cup/
├── index.html                  # Google Fonts (Cinzel, Noto Serif KR, Space Grotesk) 및 Pretendard 로드
├── package.json                # 스크립트 및 의존성 정의
├── tsconfig.json               # TypeScript 설정
├── vite.config.ts              # Vite + React + Tailwind v4 플러그인 설정
├── README.md                   # 프로젝트 소개 및 빠른 시작 가이드
├── AGENTS.md                   # AI 에이전트 작업 지침서 (현재 파일)
├── HANDOFF.md                  # 상세 인수인계 문서 및 향후 고도화 가이드
├── docs/
│   └── IMAGE_PROMPTS.md        # 32인 캐릭터 일러스트 생성용 상세 프롬프트 아카이브
├── public/
│   └── images/
│       ├── fantasy/            # 서양 중세 판타지 16인 일러스트 (f01.jpg ~ f16.jpg, 896x1200)
│       └── modern/             # 현대 대한민국 16인 일러스트 (m01.jpg ~ m16.jpg, 896x1200)
└── src/
    ├── main.tsx                # React 엔트리 포인트
    ├── index.css               # 폰트 패밀리, 그리드 배경, 키프레임 애니메이션 정의
    ├── App.tsx                 # 토너먼트 상태 머신, 키보드 단축키, Undo 스택, 모달 오케스트레이션
    ├── data/
    │   └── characters.ts       # 세계관 메타데이터 및 32인 캐릭터 데이터셋 (Fantasy 16 + Modern 16)
    ├── utils/
    │   └── soundEngine.ts      # Web Audio API 기반 실시간 효과음 & 앰비언트 BGM 신디사이저
    └── components/
        ├── AmbientStageCanvas.tsx    # 좌/우 캐릭터 컬러에 반응하는 배경 조명 & 파티클 캔버스
        ├── LobbyView.tsx             # 메인 로비 (세계관 선택, 라운드 규모 선택, 라인업 프리뷰)
        ├── KineticRoundIntro.tsx     # 32강/16강/8강/4강/결승 진입 시 키네틱 타이포그래피 연출
        ├── CharacterCard.tsx         # 3D 틸트, 스페큘러 광원, 대사/서사/시크릿 노트 토글 매치 카드
        ├── CharacterDetailModal.tsx  # 캐릭터 상세 프로필 & 스탯 바 & 전적 모달
        ├── CharacterCodexModal.tsx   # 32인 전체 도감, 테마/태그 검색, 승률/우승 랭킹 모달
        ├── BracketModal.tsx          # 실시간 대진표 및 라운드별 매치 히스토리 모달
        └── WinnerShowcase.tsx        # 최종 우승자 쇼케이스, 연승 경로, 4강 포디움, 결과 공유
```

---

## 4. 핵심 컨벤션 및 작업 규칙 (Coding & Design Rules)

1. **캐릭터 데이터 추가/수정 시 (`src/data/characters.ts`)**:
   - 모든 캐릭터는 `Character` 인터페이스를 엄격히 준수해야 합니다.
   - 단순 이미지 경로만 넣지 말고, 반드시 캐릭터의 화풍과 의상/배경에 어울리는 `title`(이명), `faction`(소속), `role`(직위), `location`(주 배경 무대), `tags`(해시태그 4개), `quote`(시그니처 고백 대사), `backstory`(3~4문장 분량의 서사), `secretNote`(우승 및 상세 보기에서 해금되는 비하인드 설정), `stats`(5대 매력 지표)를 함께 작성하세요.
   - 토너먼트 대진표는 `2의 거듭제곱(8, 16, 32...)` 단위로 동작하므로 테마별 캐릭터 수는 최소 16명 이상을 유지해야 합니다.

2. **모션 및 인터랙션 수정 시 (`prompt-motion.com` 스타일 유지)**:
   - 단순 `opacity` 페이드 대신 `framer-motion`의 `type: 'spring'` 물리 애니메이션(`stiffness: 200~300, damping: 18~26`)을 우선 사용하세요.
   - 카드 선택 시 즉시 화면을 전환하지 않고, 선택된 카드에 `SELECTED` 스탬프가 찍히며 중앙으로 확장되고 탈락 카드가 흑백 블러 처리되는 **580ms 매치컷(Match-Cut) 딜레이**(`App.tsx`의 `handlePickCharacter`)를 유지하세요.
   - 새로운 인터랙션 버튼을 추가할 때는 `soundEngine.playClick()` 또는 `soundEngine.playHoverTick()`을 연결하여 시청각 피드백의 일관성을 유지하세요.

3. **빌드 및 검증**:
   - 코드 변경 후에는 반드시 `npm run build` (`tsc -b && vite build`)를 실행하여 TypeScript 타입 에러와 프로덕션 번들링 이슈가 없는지 검증하세요.
