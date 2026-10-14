"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import type { BoardTile } from "./BoardTile";

export type FusionSpec = { id: string; x: number; y: number; a: BoardTile; b: BoardTile };

// The server quietly retries overload blips (up to ~15s), so late lines set expectations.
const LINES = ["연성 중", "기운을 섞는 중", "AI가 상상하는 중", "세계에 묻는 중", "AI가 붐비네요, 다시 연성하는 중"];

export function FusionNode({ spec }: { spec: FusionSpec }) {
  const [line, setLine] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setLine((l) => Math.min(l + 1, LINES.length - 1)), 1300);
    return () => window.clearInterval(t);
  }, []);

  return (
    <motion.div
      className="pointer-events-none absolute left-0 top-0 z-20"
      initial={{ x: spec.x, y: spec.y, scale: 0.3, opacity: 0 }}
      animate={{ x: spec.x, y: spec.y, scale: 1, opacity: 1 }}
      exit={{ scale: 1.6, opacity: 0, transition: { duration: 0.22 } }}
      transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.08 }}
    >
      <div className="relative -translate-x-1/2 -translate-y-1/2">
        <div className="relative size-24">
          <div className="fusion-core absolute inset-5 rounded-full" />
          <div className="fusion-ring absolute inset-0 rounded-full" />
          <motion.div
            className="absolute inset-0"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
          >
            <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1 text-xl">{spec.a.emoji}</span>
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 text-xl">{spec.b.emoji}</span>
          </motion.div>
        </div>
        <motion.p
          key={line}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap text-xs font-medium text-white/70"
        >
          {LINES[line]}
          <span className="inline-block w-4 animate-pulse">…</span>
        </motion.p>
      </div>
    </motion.div>
  );
}
