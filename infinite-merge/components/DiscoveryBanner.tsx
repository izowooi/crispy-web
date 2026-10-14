"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { ElementView } from "@/lib/types";

/** Center-stage reveal for a world-first discovery: kinetic letters + shimmer. */
export function DiscoveryBanner({ element, onDone }: { element: ElementView; onDone: () => void }) {
  // The parent re-renders constantly while dragging; don't let that restart the timer.
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });
  useEffect(() => {
    const t = window.setTimeout(() => doneRef.current(), 3000);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <motion.div
      className="pointer-events-none absolute inset-x-0 top-[16%] z-40 flex flex-col items-center px-6 text-center md:right-[384px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20, filter: "blur(6px)", transition: { duration: 0.35 } }}
    >
      <motion.p
        className="shimmer-text text-xs font-black tracking-[0.5em]"
        initial={{ letterSpacing: "1.2em", opacity: 0 }}
        animate={{ letterSpacing: "0.5em", opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
      >
        ✦ 세계 최초 발견 ✦
      </motion.p>
      <div className="relative mt-3 grid place-items-center">
        {/* Badge-unlock light: slow god-rays behind the emoji, fading in as it lands. */}
        <motion.div
          aria-hidden
          className="discovery-rays absolute size-56 md:size-72"
          initial={{ opacity: 0, scale: 0.4, rotate: 0 }}
          animate={{ opacity: 1, scale: 1, rotate: 60 }}
          transition={{ opacity: { duration: 0.6, delay: 0.15 }, scale: { type: "spring", stiffness: 120, damping: 14 }, rotate: { duration: 3, ease: "linear" } }}
        />
        <motion.div
          className="relative text-6xl md:text-7xl"
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 12, delay: 0.1 }}
          style={{ filter: "drop-shadow(0 10px 30px rgb(255 211 107 / 0.45))" }}
        >
          {element.emoji}
        </motion.div>
      </div>
      <h2 className="mt-2 font-serif text-4xl font-black tracking-tight md:text-5xl" aria-label={element.name}>
        {[...element.name].map((ch, i) => (
          <motion.span
            key={i}
            aria-hidden
            className="inline-block"
            initial={{ y: 28, opacity: 0, filter: "blur(8px)" }}
            animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
            transition={{ delay: 0.22 + i * 0.06, type: "spring", stiffness: 300, damping: 20 }}
          >
            {ch === " " ? "\u00a0" : <ScrambleChar char={ch} startMs={220 + i * 60} />}
          </motion.span>
        ))}
      </h2>
      {element.desc && (
        <motion.p
          className="mt-2 max-w-sm text-sm text-white/60"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {element.desc}
        </motion.p>
      )}
    </motion.div>
  );
}

const GLYPHS = "木火土金水";

/** Kinetic type: each letter flickers through the five-element glyphs before settling on itself. */
function ScrambleChar({ char, startMs }: { char: string; startMs: number }) {
  const [shown, setShown] = useState(() => GLYPHS[char.charCodeAt(0) % GLYPHS.length]);
  useEffect(() => {
    let frame = 0;
    let interval: number | undefined;
    const start = window.setTimeout(() => {
      interval = window.setInterval(() => {
        frame += 1;
        if (frame >= 7) {
          setShown(char);
          window.clearInterval(interval);
        } else {
          setShown(GLYPHS[(frame + char.charCodeAt(0)) % GLYPHS.length]);
        }
      }, 55);
    }, startMs);
    return () => {
      window.clearTimeout(start);
      if (interval) window.clearInterval(interval);
    };
  }, [char, startMs]);
  return <>{shown}</>;
}
