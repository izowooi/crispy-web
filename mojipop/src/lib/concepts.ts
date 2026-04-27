export type Quality = "low" | "medium" | "high";

export interface Concept {
  id: number;
  categoryId: number;
  labelKo: string;
  labelEn: string;
  prompt: string;
}

const BASE =
  "Create a cute cartoon sticker/emoticon based on the character in the reference image. " +
  "Style: simple cartoon sticker, bold black outlines, expressive face, flat color fills, " +
  "clean white background, square composition, suitable for messaging apps.";

export const CONCEPTS: Concept[] = [
  // 감정 (Emotions) — ids 1-8
  {
    id: 1,
    categoryId: 1,
    labelKo: "행복",
    labelEn: "Happy",
    prompt: `${BASE} Show the character with a big joyful smile, rosy cheeks, and sparkling eyes radiating pure happiness.`,
  },
  {
    id: 2,
    categoryId: 1,
    labelKo: "폭소",
    labelEn: "LOL",
    prompt: `${BASE} Show the character laughing uncontrollably with tears streaming down, mouth wide open, clutching their belly.`,
  },
  {
    id: 3,
    categoryId: 1,
    labelKo: "슬픔",
    labelEn: "Sad",
    prompt: `${BASE} Show the character looking deeply sad with downturned mouth, puppy eyes, and a single teardrop rolling down their cheek.`,
  },
  {
    id: 4,
    categoryId: 1,
    labelKo: "화남",
    labelEn: "Angry",
    prompt: `${BASE} Show the character furious with furrowed brows, clenched teeth, red face, and steam puffing from the top of their head.`,
  },
  {
    id: 5,
    categoryId: 1,
    labelKo: "놀람",
    labelEn: "Surprised",
    prompt: `${BASE} Show the character with an exaggerated shocked expression — wide-open eyes, jaw dropping, arms raised in disbelief.`,
  },
  {
    id: 6,
    categoryId: 1,
    labelKo: "사랑",
    labelEn: "Love",
    prompt: `${BASE} Show the character with heart-shaped eyes, a dreamy smile, and small pink hearts floating around their head.`,
  },
  {
    id: 7,
    categoryId: 1,
    labelKo: "졸림",
    labelEn: "Sleepy",
    prompt: `${BASE} Show the character with half-closed droopy eyes, a sleepy smile, and small "Zzz" bubbles floating above their head.`,
  },
  {
    id: 8,
    categoryId: 1,
    labelKo: "당황",
    labelEn: "Embarrassed",
    prompt: `${BASE} Show the character blushing intensely with red cheeks, wide nervous eyes, and both hands raised to their face.`,
  },

  // 반응 (Reactions) — ids 9-16
  {
    id: 9,
    categoryId: 2,
    labelKo: "좋아요",
    labelEn: "Thumbs Up",
    prompt: `${BASE} Show the character giving an enthusiastic thumbs up with a confident grin and sparkling effect around the thumb.`,
  },
  {
    id: 10,
    categoryId: 2,
    labelKo: "싫어요",
    labelEn: "Thumbs Down",
    prompt: `${BASE} Show the character giving a thumbs down with a disapproving frown and crossed arms.`,
  },
  {
    id: 11,
    categoryId: 2,
    labelKo: "박수",
    labelEn: "Clapping",
    prompt: `${BASE} Show the character clapping enthusiastically with both hands raised, a big smile, and clap-effect lines around their hands.`,
  },
  {
    id: 12,
    categoryId: 2,
    labelKo: "안녕 (인사)",
    labelEn: "Hello Wave",
    prompt: `${BASE} Show the character waving hello energetically with a wide friendly smile and "HI!" in a cute speech bubble beside them.`,
  },
  {
    id: 13,
    categoryId: 2,
    labelKo: "잘 가",
    labelEn: "Goodbye",
    prompt: `${BASE} Show the character waving goodbye with a sweet smile and "BYE~" in a speech bubble, with stars trailing from their waving hand.`,
  },
  {
    id: 14,
    categoryId: 2,
    labelKo: "OK",
    labelEn: "OK",
    prompt: `${BASE} Show the character making the OK circle gesture with their fingers and a confident wink, with the text "OK!" prominently displayed.`,
  },
  {
    id: 15,
    categoryId: 2,
    labelKo: "부탁해",
    labelEn: "Please",
    prompt: `${BASE} Show the character with both hands pressed together in a pleading pose, looking up with big puppy eyes. Text "제발" in a small speech bubble.`,
  },
  {
    id: 16,
    categoryId: 2,
    labelKo: "화이팅!",
    labelEn: "Fighting!",
    prompt: `${BASE} Show the character pumping their fist in the air with a determined energetic expression and the text "화이팅!" in a bold speech bubble with a star burst effect.`,
  },

  // 일상 (Daily Life) — ids 17-24
  {
    id: 17,
    categoryId: 3,
    labelKo: "밥 먹기",
    labelEn: "Eating",
    prompt: `${BASE} Show the character happily eating with chopsticks and a rice bowl in hand, steam rising from the food, and a satisfied expression with full rosy cheeks.`,
  },
  {
    id: 18,
    categoryId: 3,
    labelKo: "자는 중",
    labelEn: "Sleeping",
    prompt: `${BASE} Show the character sleeping peacefully with a cozy pillow, a gentle smile, eyes closed, and large "Zzz" bubbles floating above.`,
  },
  {
    id: 19,
    categoryId: 3,
    labelKo: "업무 중",
    labelEn: "Working",
    prompt: `${BASE} Show the character sitting at a laptop with a focused expression, coffee mug beside the keyboard, and text visible on the laptop screen.`,
  },
  {
    id: 20,
    categoryId: 3,
    labelKo: "게임 중",
    labelEn: "Gaming",
    prompt: `${BASE} Show the character intensely playing video games, holding a game controller with both hands, eyes wide with focus.`,
  },
  {
    id: 21,
    categoryId: 3,
    labelKo: "운동",
    labelEn: "Exercise",
    prompt: `${BASE} Show the character doing an energetic workout — lifting a dumbbell — with sweat drops flying and a motivated expression.`,
  },
  {
    id: 22,
    categoryId: 3,
    labelKo: "독서",
    labelEn: "Reading",
    prompt: `${BASE} Show the character absorbed in reading a book, holding it with both hands, a thoughtful expression, and small light bulbs floating above their head.`,
  },
  {
    id: 23,
    categoryId: 3,
    labelKo: "노래",
    labelEn: "Singing",
    prompt: `${BASE} Show the character singing with mouth open wide, holding a microphone, musical notes floating around them, and a joyful expression.`,
  },
  {
    id: 24,
    categoryId: 3,
    labelKo: "셀카",
    labelEn: "Selfie",
    prompt: `${BASE} Show the character holding a phone at arm's length taking a selfie, making a cute peace-sign pose, with a big smile and sparkles around the camera.`,
  },

  // 한국어 표현 (Korean Expressions) — ids 25-32
  {
    id: 25,
    categoryId: 4,
    labelKo: "감사합니다",
    labelEn: "Thank You",
    prompt: `${BASE} Show the character bowing gratefully with both hands pressed together, a warm sincere smile, and the text "감사합니다" in a cute speech bubble.`,
  },
  {
    id: 26,
    categoryId: 4,
    labelKo: "미안해요",
    labelEn: "Sorry",
    prompt: `${BASE} Show the character bowing deeply in apology with an apologetic guilty expression, small sweat drops, and the text "미안해요" in a speech bubble.`,
  },
  {
    id: 27,
    categoryId: 4,
    labelKo: "진짜요?",
    labelEn: "Really?",
    prompt: `${BASE} Show the character with a skeptical sideways glance, one eyebrow raised, arms crossed, and the text "진짜요?" in a tilted speech bubble.`,
  },
  {
    id: 28,
    categoryId: 4,
    labelKo: "헐",
    labelEn: "OMG",
    prompt: `${BASE} Show the character in total disbelief with giant shocked eyes, both hands on their cheeks, mouth agape, and the text "헐!!!" in a jagged speech explosion bubble.`,
  },
  {
    id: 29,
    categoryId: 4,
    labelKo: "좋은 아침",
    labelEn: "Good Morning",
    prompt: `${BASE} Show the character cheerfully waking up — stretching arms with a yawning smile, morning sun rays behind them, and the text "좋은 아침!" in a bright speech bubble.`,
  },
  {
    id: 30,
    categoryId: 4,
    labelKo: "잘 자요",
    labelEn: "Good Night",
    prompt: `${BASE} Show the character yawning sleepily while waving goodnight, a crescent moon in the corner, and the text "잘 자요~" in a soft dreamy speech bubble.`,
  },
  {
    id: 31,
    categoryId: 4,
    labelKo: "축하해요",
    labelEn: "Congratulations",
    prompt: `${BASE} Show the character with arms raised in celebration, confetti and party streamers raining down, a huge grin, and the text "축하해요! 🎉" in a festive speech bubble.`,
  },
  {
    id: 32,
    categoryId: 4,
    labelKo: "같이 가요",
    labelEn: "Let's Go",
    prompt: `${BASE} Show the character excitedly pointing forward and beckoning with their other hand, a big enthusiastic smile, and the text "같이 가요!" in an energetic speech bubble.`,
  },
];

// Fixed 8 auto-selected concepts: 2 per category (balanced variety)
// 행복·폭소 / 좋아요·화이팅! / 밥먹기·자는중 / 감사합니다·미안해요
export const DEFAULT_CONCEPT_IDS: number[] = [1, 2, 9, 16, 17, 18, 25, 26];
