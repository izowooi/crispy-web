# 🏆 MUSE CUP : 이상형 월드컵 (Chronicles of Arcadia & Seoul Cinematic Romance)

한국 로맨스 판타지 웹툰(로판) 및 현대 청춘 애니메이션 화풍으로 제작된 **인터랙티브 이상형 월드컵 웹 게임**입니다.
[prompt-motion.com](https://prompt-motion.com/)의 모션 디자인 철학(키네틱 타이포그래피, 스프링 물리 인터랙션, 3D 원근 틸트 및 스페큘러 라이팅, 코드 기반 Web Audio 프로시저럴 사운드 엔진)을 적용했습니다.

## ✨ 주요 특징

1. **두 가지 핵심 세계관 + 차원 통합 올스타전 완벽 수록 (총 32인 히로인)**
   - 🏰 **서양 중세 판타지 : 아르카디아 연대기 (16강 / 8강)**
     - 대신전의 백은 성녀, 북부 대공가의 흑장미 소공녀, 제1황녀, 마탑주, 세계수의 엘프 왕녀 등 16인의 오리지널 로판 히로인 수록
   - 🏙️ **현대 대한민국 : 서울 시네마틱 로맨스 (16강 / 8강)**
     - 연희동 캠퍼스 선배, 톱 아이돌 센터, 테헤란로 팀장, 홍대 인디 밴드 보컬, 서초동 첫눈의 피아니스트 등 현대 서울 배경의 16인 히로인 수록
   - 👑 **차원 통합 올스타 : 그랜드 월드컵 (32강 / 16강 / 8강)**
     - 두 세계관의 히로인 32인이 총출동하는 통합 토너먼트 지원

2. **깊이 있는 캐릭터 서사 & 설정**
   - 단순 이미지 대결을 넘어 **이름, 칭호(이명), 소속, 주 배경 장소(Stage), MBTI/나이, 매력 해시태그, 시그니처 보이스 대사, 상세 배경 서사(Backstory), 히든 비하인드 설정(Secret Note), 5대 매력 스탯**을 매치 카드에서 즉시 확인 가능

3. **Prompt-Motion 스타일 모션 & 사운드 연출**
   - **Kinetic Round Intro**: 매 라운드 진입 시(32강 / 16강 / 8강 / 4강 / 결승전) 키네틱 타이포그래피와 슬래시 셔터 연출
   - **3D Tilt & Rim Glare Cards**: 마우스 움직임에 반응하는 3D 원근 회전 및 실시간 스페큘러 하이라이트 광원
   - **Dual-Key Ambient Canvas**: 좌·우 대결 히로인의 시그니처 컬러에 맞춰 실시간으로 반응하는 캔버스 조명 및 별빛/보케 파티클
   - **Web Audio Synthesizer**: 외부 오디오 파일 없이 코드로 실시간 합성되는 호버 틱, 선택 임팩트, 라운드 전환 스웰, 우승 팡파르 및 앰비언트 BGM

## 🚀 로컬 실행 방법

```bash
# 의존성 설치
npm install

# 로컬 개발 서버 실행 (http://localhost:5173)
npm run dev

# 프로덕션 빌드 검증
npm run build
```

## ⌨️ 단축키 안내
- `←` 또는 `1` / `A` : 왼쪽 히로인 선택
- `→` 또는 `2` / `D` : 오른쪽 히로인 선택
- `Z` 또는 `Backspace` : 이전 선택 되돌리기 (Undo)
- `B` : 실시간 토너먼트 대진표 및 매치 기록 열기
- `ESC` : 모달 닫기 / 라운드 인트로 스킵

## 64-Star Edition & Cloudflare 배포

- 에디션: 히로인 32 (판타지/현대) · 히어로 32 (여성향 남주 판타지/현대) · 전체 64강
- 스택: React SPA + Cloudflare Worker + D1 + R2 (`cf` CLI, `cloudflare.config.ts`)
- 라이브: https://dg.zowoo.uk · https://dreamgirl.zowoo.uk · 아키텍처 쇼케이스 `/architecture`

```bash
npm install
npm test                # Worker 단위 테스트
npm run build           # tsc + vite build
npm run db:migrate      # D1 마이그레이션
npm run upload:images   # R2에 64장 업로드
npm run deploy          # build + cf deploy
```

자세한 결정 기록: [attention.md](attention.md) · 학습 자료: [learn/](learn/README.md)
