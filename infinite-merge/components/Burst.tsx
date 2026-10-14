"use client";

import { motion } from "motion/react";

type Spark = { dx: number; dy: number; size: number; tint: string; delay: number; duration: number };

export type BurstSpec = { id: string; x: number; y: number; big: boolean; ring: string; sparks: Spark[] };

/** Randomized once, when the fusion resolves, so re-renders don't reshuffle the particles. */
export function makeSparks(tints: string[], big: boolean): Spark[] {
  const n = big ? 26 : 14;
  return Array.from({ length: n }, (_, i) => {
    const angle = (i / n) * Math.PI * 2 + Math.random() * 0.4;
    const dist = (big ? 90 : 56) + Math.random() * (big ? 80 : 40);
    return {
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist,
      size: 3 + Math.random() * (big ? 5 : 3),
      tint: tints[i % tints.length],
      delay: Math.random() * 0.06,
      duration: 0.75 + Math.random() * 0.3,
    };
  });
}

/** Radial spark burst + shockwave ring played where a fusion resolves. */
export function Burst({ spec }: { spec: BurstSpec }) {
  return (
    <div className="pointer-events-none absolute z-30" style={{ left: spec.x, top: spec.y }}>
      <motion.div
        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
        style={{ borderColor: `rgb(${spec.ring} / 0.7)` }}
        initial={{ width: 20, height: 20, opacity: 0.9 }}
        animate={{ width: spec.big ? 260 : 150, height: spec.big ? 260 : 150, opacity: 0 }}
        transition={{ duration: spec.big ? 0.8 : 0.55, ease: [0.2, 0.7, 0.3, 1] }}
      />
      {spec.sparks.map((s, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            width: s.size,
            height: s.size,
            marginLeft: -s.size / 2,
            marginTop: -s.size / 2,
            background: `rgb(${s.tint})`,
            boxShadow: `0 0 10px rgb(${s.tint} / 0.9)`,
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: s.dx, y: s.dy, opacity: 0, scale: 0.2 }}
          transition={{ duration: s.duration, delay: s.delay, ease: [0.1, 0.8, 0.3, 1] }}
        />
      ))}
    </div>
  );
}
