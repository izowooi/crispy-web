"use client";

import { motion } from "motion/react";
import { useEffect, useRef } from "react";

export type Milestone = { count: number; title: string; emoji: string };

/** Titles unlocked by how many elements (beyond the five bases) a player has discovered. */
export const MILESTONES: Milestone[] = [
  { count: 10, title: "견습 연금술사", emoji: "🌱" },
  { count: 25, title: "오행 수련생", emoji: "☯️" },
  { count: 50, title: "연성 장인", emoji: "⚗️" },
  { count: 100, title: "대연금술사", emoji: "🔮" },
  { count: 200, title: "현자의 길", emoji: "📜" },
  { count: 500, title: "오행의 주인", emoji: "🐉" },
  { count: 1000, title: "무한의 연금술사", emoji: "♾️" },
];

/** Highest milestone crossed when the count moved from `before` to `after`, if any. */
export function crossedMilestone(before: number, after: number): Milestone | null {
  const crossed = MILESTONES.filter((m) => before < m.count && m.count <= after);
  return crossed.at(-1) ?? null;
}

const HEX = "60,4 112,32 112,88 60,116 8,88 8,32";

/** Badge unlock: a hexagon medal drops onto a pedestal under god-rays, then the title types in. */
export function MilestoneBadge({ milestone, onDone }: { milestone: Milestone; onDone: () => void }) {
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });
  useEffect(() => {
    const t = window.setTimeout(() => doneRef.current(), 3800);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <motion.div
      role="status"
      className="absolute inset-0 z-50 grid place-items-center bg-black/45 backdrop-blur-[2px] md:right-[384px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35 } }}
      onClick={() => doneRef.current()}
    >
      <div className="relative flex flex-col items-center text-center">
        <motion.div
          aria-hidden
          className="discovery-rays absolute top-[-40px] size-72"
          initial={{ opacity: 0, rotate: -20 }}
          animate={{ opacity: 1, rotate: 40 }}
          transition={{ opacity: { duration: 0.5, delay: 0.35 }, rotate: { duration: 4, ease: "linear" } }}
        />
        <motion.div
          className="relative"
          initial={{ y: -160, rotateY: 0, scaleX: 1, scaleY: 1 }}
          animate={{ y: [-160, 0, -14, 0], rotateY: [0, 0, 360, 360], scaleX: [1, 1.18, 0.96, 1], scaleY: [1, 0.82, 1.04, 1] }}
          transition={{ duration: 1.2, times: [0, 0.38, 0.75, 1], ease: "easeOut" }}
          style={{ transformPerspective: 600 }}
        >
          <svg viewBox="0 0 120 120" className="size-32 drop-shadow-[0_12px_30px_rgb(255_211_107/0.35)]">
            <defs>
              <linearGradient id="badge-gold" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#fff1b8" />
                <stop offset="0.5" stopColor="#ffd36b" />
                <stop offset="1" stopColor="#b8862e" />
              </linearGradient>
              <radialGradient id="badge-fill" cx="0.5" cy="0.35" r="0.75">
                <stop offset="0" stopColor="#2a3570" />
                <stop offset="1" stopColor="#0b0f24" />
              </radialGradient>
            </defs>
            <polygon points={HEX} fill="url(#badge-fill)" stroke="url(#badge-gold)" strokeWidth="5" strokeLinejoin="round" />
          </svg>
          <span className="absolute inset-0 grid place-items-center text-5xl">{milestone.emoji}</span>
        </motion.div>
        <motion.div
          aria-hidden
          className="mt-1 h-3 w-28 rounded-[50%] bg-white/15 blur-[2px]"
          initial={{ scaleX: 0.3, opacity: 0 }}
          animate={{ scaleX: [0.3, 1.15, 1], opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.35 }}
        />
        <motion.p
          className="shimmer-text mt-5 text-xs font-black tracking-[0.45em]"
          initial={{ opacity: 0, letterSpacing: "1em" }}
          animate={{ opacity: 1, letterSpacing: "0.45em" }}
          transition={{ delay: 0.9, duration: 0.6 }}
        >
          칭호 획득
        </motion.p>
        <h2 className="mt-2 font-serif text-3xl font-black tracking-tight md:text-4xl">
          {[...milestone.title].map((ch, i) => (
            <motion.span
              key={i}
              className="inline-block"
              initial={{ y: 18, opacity: 0, filter: "blur(6px)" }}
              animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
              transition={{ delay: 1.05 + i * 0.05, type: "spring", stiffness: 300, damping: 20 }}
            >
              {ch === " " ? " " : ch}
            </motion.span>
          ))}
        </h2>
        <motion.p
          className="mt-2 text-sm text-white/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          원소 {milestone.count}개를 발견했어요
        </motion.p>
      </div>
    </motion.div>
  );
}
