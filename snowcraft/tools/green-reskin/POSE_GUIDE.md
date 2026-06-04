# green 캐릭터 포즈 가이드 (AI 생성용)

`sources/`에 있는 **19개 이미지**를 6가지 동작 타입으로 묶어 정리했습니다.
각 이미지가 어떤 자세인지 설명과 함께, AI 이미지 생성기에 바로 쓸 수 있는 영문 프롬프트를 넣었습니다.

> 19개는 "19가지 동작"이 아니라, **6개 동작 타입**의 키프레임들입니다.
> (걷기 2 · 대기 1 · 눈모으기 1 · 던지기 2 · 피격/회복 3 · 쓰러짐/사망 6 · 승리 4 = 19)

원본 포즈는 `reference/<번호>_x6.png` (6배 확대)로 눈으로 확인할 수 있습니다.

---

## 0. 모든 이미지 공통 규칙

- **캐릭터(고정)**: 항상 같은 핑크 토끼. 아래 문장을 모든 프롬프트 맨 앞에 붙이세요.

  > A cute chubby 3D mascot **pink rabbit** with long floppy pink ears, rosy cheeks, a small pink nose, big shiny brown eyes, wearing **blue denim overalls** over a **yellow-and-cream horizontally-striped shirt**, light-blue and pink rounded boots.

- **방향**: 특별한 말이 없으면 **왼쪽을 바라보는 3/4 측면**. (원본 캐릭터가 왼쪽을 향합니다.)
- **배경**: **완전 투명** PNG. (배경/그림자/체커보드 금지. 그림자는 빼는 게 깔끔합니다.)
- **구도**: 캐릭터 한 명만. 글자·테두리·여러 컷 금지. **발이 이미지의 하단-가운데**에 오게.
- **크기**: 19개 전부 **몸 크기를 똑같이** 유지하세요. 한 장만 크거나 작으면 게임에서 들썩입니다.
  최종 PNG는 작게(대략 높이 40~70px). 크게 그렸으면 저장 전에 줄이세요. (높이 170px 미만 필수)
- **눈뭉치**: 흰색 둥근 눈뭉치. "들고 있음/던짐" 표시가 있는 포즈에만 넣으세요.

영문 프롬프트 꼬리표(공통, 끝에 붙이기):

> single character, facing left, 3/4 view, fully transparent background, no shadow, no text, cute game sprite, chunky and simple.

---

## 1. 🚶 이동 (걷기) — 2장

좌우로 걸어 다닐 때 번갈아 재생되는 보행 키프레임 2장입니다.

| 파일 | 자세 | 영문 프롬프트(포즈) |
|------|------|---------------------|
| `1.png` | 한 발을 앞으로 내딛는 걸음. 앞으로 살짝 기울이고 눈뭉치를 든 채 이동. | `walking, mid-stride with one leg forward, leaning slightly forward, carrying a small white snowball` |
| `4.png` | 반대 발을 내딛는 걸음(1과 짝). 보폭이 바뀐 모습. | `walking, mid-stride with the other leg forward (opposite step), carrying a small white snowball` |

---

## 2. 🧍 대기 (서 있기) — 1장

| 파일 | 자세 | 영문 프롬프트(포즈) |
|------|------|---------------------|
| `7.png` | 가만히 서서 대기. 살짝 눈뭉치를 든 편안한 자세. | `standing still and relaxed, holding a small white snowball` |

---

## 3. ⛄ 눈 모으기 (★가장 자주 보임) — 1장

평상시 green이 제일 많이 취하는 자세라 **가장 중요**합니다.

| 파일 | 자세 | 영문 프롬프트(포즈) |
|------|------|---------------------|
| `8.png` | 앞으로 **웅크려** 두 손을 땅 근처로 내려 눈을 뭉치는 중. 누운 게 아니라 **쪼그려 앉은** 자세. | `crouching down low, bending forward, packing a snowball with both paws near the ground (NOT lying down, stays compact and upright on its feet)` |

---

## 4. 🎯 던지기 — 2장

준비 동작과 던지는 순간 2장입니다.

| 파일 | 자세 | 영문 프롬프트(포즈) |
|------|------|---------------------|
| `9.png` | 던지기 **준비(와인드업)**. 살짝 웅크려 눈뭉치를 가슴/머리 쪽으로 당김. | `winding up to throw, slightly crouched, pulling a white snowball back near its chest/head` |
| `10.png` | **던지는 순간**. 몸을 펴고 팔을 앞으로 뻗어 눈뭉치를 놓는 릴리스. | `throwing release, body straightened, arm extended forward letting go of the snowball` |

---

## 5. 💥 피격 · 회복 — 3장

눈에 맞고 휘청였다가 다시 일어서는 흐름입니다.

| 파일 | 자세 | 영문 프롬프트(포즈) |
|------|------|---------------------|
| `11.png` | **맞는 순간**. 얼굴에 눈이 퍽 터지고 움찔하며 뒤로 젖혀짐. | `getting hit by a snowball, recoiling backward, a white snow splat bursting on its face, eyes scrunched` |
| `13.png` | 맞은 뒤 **휘청/움츠림**. 앞으로 숙여 팔로 몸을 감싸며 비틀거림. | `staggering after a hit, hunched forward, arms clutched to the body, off-balance` |
| `26.png` | **회복 중**. 다시 균형을 잡고 일어서려는 모습(눈뭉치 든 채). | `recovering and regaining balance, starting to stand back up, holding a snowball` |

---

## 6. 💫 쓰러짐 · 사망 — 6장

두 번 맞으면 쓰러지고, 더 맞으면 산산이 흩어지며 KO됩니다.
(눈싸움 만화풍이라 "옷/부츠가 펑 하고 흩어지는" 과장된 표현입니다.)

| 파일 | 자세 | 영문 프롬프트(포즈) |
|------|------|---------------------|
| `33.png` | **주저앉기 시작**. 뒤로 엉덩방아 찧듯 낮게 무너지는 시작 동작. | `knocked down, plopping backward onto the ground, sitting low and dazed` |
| `35.png` | **바닥에 누움**(가장 많이 쓰임). 등/옆으로 쓰러져 다운된 상태 유지. | `lying knocked-down on the ground, on its back/side, dazed and still` |
| `60.png` | **사망 KO 1**. 뒤로 뻗어 누운 채 작은 눈조각들이 주변에 흩어짐. | `knocked out lying flat on its back, with a few small snow/clothing bits scattered around` |
| `62.png` | **사망 KO 2**. 가로로 길게 뻗어 쓰러지고 부츠/멜빵이 옆으로 흩어짐. | `knocked out sprawled out horizontally, one boot and overall piece flung off to the side` |
| `63.png` | **사망 KO 3**. 팔다리를 벌린 채 큰대자로 뻗고 조각들이 더 넓게 흩어짐. | `knocked out spread-eagled on the ground, snow and clothing bits scattered more widely` |
| `64.png` | **사망 KO 4 (마지막 정지)**. 옆으로 웅크려 쓰러진 비교적 정돈된 마무리 포즈. | `knocked out lying on its side, more compact, a couple of bits nearby (final resting pose)` |

> 6장이 부담되면 우선 `35.png`(가장 많이 복사됨) 한 장만 제대로 만들어도 다운 상태가 그럴듯해집니다.
> 나머지 사망 4종은 "쓰러져 흩어진" 같은 컨셉의 변형이라 살짝씩만 다르게 그리면 됩니다.

---

## 7. 🎉 승리 — 4장

상대(red 플레이어)를 다 이겼을 때 green이 환호하는 루프 동작 4장입니다.
모두 "양팔 들고 눈뭉치 들고 좋아하는" 비슷한 느낌의 변형입니다.

| 파일 | 자세 | 영문 프롬프트(포즈) |
|------|------|---------------------|
| `65.png` | 두 팔을 **번쩍 들고** 양손에 눈뭉치를 든 환호. | `cheering with both arms raised high, holding a white snowball in each paw, happy` |
| `69.png` | 팔을 들고 깡충 뛰며 좋아함(눈뭉치 하나). | `jumping for joy with arms up, holding one snowball, excited` |
| `81.png` | 두 눈뭉치를 머리 위로 들고 신난 모습(약간 다른 동작). | `celebrating, raising two snowballs above its head, big happy expression` |
| `86.png` | 눈뭉치를 들고 환호하는 마무리 루프 포즈. | `cheering loop pose, holding a snowball, arms up, joyful` |

> 4장이 부담되면 `86.png`(가장 많이 복사됨) → `65.png` 순으로 우선 만드세요.

---

## 작업 우선순위 (시간 없을 때)

1. **3번 눈모으기(`8.png`)** — 평상시 제일 많이 보임. 무조건 먼저.
2. **1번 걷기(`1`,`4`) + 2번 대기(`7`) + 4번 던지기(`9`,`10`)** — 전투 중 늘 보이는 핵심 6장.
3. 5번 피격/회복(3장) → 7번 승리(4장) → 6번 사망(6장) 순.

위 6장(8,1,4,7,9,10)만 바꿔도 게임 속 green이 새 캐릭터로 보입니다.

## 다 그린 뒤

```bash
node tools/green-reskin/build.mjs --dry   # 미리보기
node tools/green-reskin/build.mjs         # 19장 → 98프레임 복사 + index.json 자동 갱신
npm run dev                               # 게임에서 확인
```

자세한 그리기 규칙·표는 같은 폴더 `TASKS.md` 참고.
