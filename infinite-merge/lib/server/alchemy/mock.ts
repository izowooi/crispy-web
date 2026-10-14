import { createHash } from "node:crypto";
import { pairKey } from "@/lib/elements";
import type { ParsedElement } from "./parse";

// Offline stand-in for the model so the UI can be exercised without a ChatGPT account.
const BASE_TABLE: Record<string, ParsedElement> = {
  [pairKey("나무", "나무")]: { name: "숲", emoji: "🌲", desc: "나무가 모여 이룬 초록 왕국" },
  [pairKey("나무", "불")]: { name: "숯", emoji: "🪵", desc: "목생화의 끝에 남는 검은 잔불" },
  [pairKey("나무", "흙")]: { name: "밭", emoji: "🌾", desc: "뿌리가 땅을 갈아 만든 터전" },
  [pairKey("나무", "금속")]: { name: "도끼", emoji: "🪓", desc: "금극목, 쇠가 나무를 이긴다" },
  [pairKey("나무", "물")]: { name: "새싹", emoji: "🌱", desc: "수생목, 물을 마신 첫 숨" },
  [pairKey("불", "불")]: { name: "태양", emoji: "☀️", desc: "꺼지지 않는 하늘의 화로" },
  [pairKey("불", "흙")]: { name: "도자기", emoji: "🏺", desc: "화생토, 불이 구운 흙의 시" },
  [pairKey("불", "금속")]: { name: "용광로", emoji: "🌋", desc: "쇠를 녹여 새로 태어나게 하는 곳" },
  [pairKey("불", "물")]: { name: "증기", emoji: "♨️", desc: "불과 물이 다투다 하늘로 도망친 것" },
  [pairKey("흙", "흙")]: { name: "산", emoji: "🏔️", desc: "흙이 쌓여 하늘에 닿으려 한 흔적" },
  [pairKey("흙", "금속")]: { name: "광석", emoji: "🪨", desc: "토생금, 땅이 품어 기른 쇠" },
  [pairKey("흙", "물")]: { name: "진흙", emoji: "🟫", desc: "토극수, 물을 가둔 흙" },
  [pairKey("금속", "금속")]: { name: "강철", emoji: "🔩", desc: "단단함에 단단함을 더한 것" },
  [pairKey("금속", "물")]: { name: "녹", emoji: "🟠", desc: "물이 쇠에게 남긴 시간의 자국" },
  [pairKey("물", "물")]: { name: "호수", emoji: "🏞️", desc: "물이 모여 하늘을 비추는 곳" },
};

const POOL: ParsedElement[] = [
  { name: "구름", emoji: "☁️" }, { name: "번개", emoji: "⚡" }, { name: "무지개", emoji: "🌈" },
  { name: "화산", emoji: "🌋" }, { name: "사막", emoji: "🏜️" }, { name: "바다", emoji: "🌊" },
  { name: "섬", emoji: "🏝️" }, { name: "생명", emoji: "🧬" }, { name: "공룡", emoji: "🦖" },
  { name: "용", emoji: "🐉" }, { name: "거북선", emoji: "🛶" }, { name: "검", emoji: "🗡️" },
  { name: "방패", emoji: "🛡️" }, { name: "성", emoji: "🏯" }, { name: "도시", emoji: "🏙️" },
  { name: "로봇", emoji: "🤖" }, { name: "인공지능", emoji: "🧠" }, { name: "우주", emoji: "🌌" },
  { name: "별", emoji: "⭐" }, { name: "달", emoji: "🌙" }, { name: "시간", emoji: "⏳" },
  { name: "음악", emoji: "🎵" }, { name: "김치", emoji: "🥬" }, { name: "라면", emoji: "🍜" },
  { name: "떡볶이", emoji: "🌶️" }, { name: "한옥", emoji: "🏠" }, { name: "도깨비", emoji: "👹" },
  { name: "구미호", emoji: "🦊" }, { name: "연금술사", emoji: "🧙" }, { name: "현자의 돌", emoji: "💎" },
  { name: "유리", emoji: "🪟" }, { name: "보석", emoji: "💍" }, { name: "시계", emoji: "⌚" },
  { name: "기차", emoji: "🚂" }, { name: "비행기", emoji: "✈️" }, { name: "로켓", emoji: "🚀" },
  { name: "인터넷", emoji: "🌐" }, { name: "게임", emoji: "🎮" }, { name: "꿈", emoji: "💭" },
  { name: "사랑", emoji: "❤️" }, { name: "전설", emoji: "📜" }, { name: "블랙홀", emoji: "🕳️" },
];

function hasBatchim(word: string): boolean {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0;
}

export async function mockCombine(a: string, b: string, delayMs?: number): Promise<ParsedElement> {
  const key = pairKey(a, b);
  const wait = delayMs ?? 400 + (createHash("sha256").update(`${key}#delay`).digest()[0] / 255) * 500;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  const fixed = BASE_TABLE[key];
  if (fixed) return fixed;
  const idx = createHash("sha256").update(key).digest().readUInt32BE(0) % POOL.length;
  const pick = POOL[idx];
  return { ...pick, desc: `${a}${hasBatchim(a) ? "과" : "와"} ${b}${hasBatchim(b) ? "이" : "가"} 만나 생긴 ${pick.name}` };
}
