import { StrengthLevel } from "./strength";

export interface StrengthLevelMeta {
  level: StrengthLevel;
  emoji: string;
  imageSrc: string;
  barClass: string;
}

export const STRENGTH_LEVELS: StrengthLevelMeta[] = [
  { level: 1, emoji: "🥲", imageSrc: "/strength/level-1.svg", barClass: "bg-stone-400" },
  { level: 2, emoji: "😪", imageSrc: "/strength/level-2.svg", barClass: "bg-stone-500" },
  { level: 3, emoji: "🙂", imageSrc: "/strength/level-3.svg", barClass: "bg-amber-500" },
  { level: 4, emoji: "😊", imageSrc: "/strength/level-4.svg", barClass: "bg-yellow-500" },
  { level: 5, emoji: "😎", imageSrc: "/strength/level-5.svg", barClass: "bg-lime-500" },
  { level: 6, emoji: "🧑‍🎓", imageSrc: "/strength/level-6.svg", barClass: "bg-green-500" },
  { level: 7, emoji: "🧑‍💼", imageSrc: "/strength/level-7.svg", barClass: "bg-emerald-500" },
  { level: 8, emoji: "🧑‍⚖️", imageSrc: "/strength/level-8.svg", barClass: "bg-teal-500" },
  { level: 9, emoji: "🤵", imageSrc: "/strength/level-9.svg", barClass: "bg-cyan-500" },
  { level: 10, emoji: "🤴", imageSrc: "/strength/level-10.svg", barClass: "bg-sky-500" },
];

export function getLevelMeta(level: StrengthLevel): StrengthLevelMeta {
  return STRENGTH_LEVELS[level - 1];
}
