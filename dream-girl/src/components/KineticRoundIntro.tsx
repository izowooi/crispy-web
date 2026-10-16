import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Swords, Crown } from 'lucide-react';
import type { WorldTheme } from '../data/characters';

interface KineticRoundIntroProps {
  roundSize: number | null;
  theme: WorldTheme;
  onSkip: () => void;
}

export const getRoundLabels = (roundSize: number) => {
  switch (roundSize) {
    case 64:
      return {
        en: 'ROUND OF 64',
        kr: '64강 그랜드 마스터즈',
        sub: '네 개의 차원, 예순네 명의 주인공이 격돌하는 초대형 무대',
        code: 'STAGE // 64 · 32 MATCHES',
      };
    case 32:
      return {
        en: 'ROUND OF 32',
        kr: '32강 통합 토너먼트',
        sub: '서른두 개의 운명이 교차하는 첫 번째 무대',
        code: 'STAGE // 32 · 16 MATCHES',
      };
    case 16:
      return {
        en: 'ROUND OF 16',
        kr: '운명의 16강 토너먼트',
        sub: '열여섯 명의 주인공, 여덟 번의 선택',
        code: 'STAGE // 16 · 08 MATCHES',
      };
    case 8:
      return {
        en: 'QUARTERFINALS',
        kr: '8강 토너먼트',
        sub: '절반으로 좁혀진 마음의 행방',
        code: 'STAGE // 08 · 04 MATCHES',
      };
    case 4:
      return {
        en: 'SEMIFINALS',
        kr: '4강 준결승전',
        sub: '결승으로 향하는 마지막 관문',
        code: 'STAGE // 04 · 02 MATCHES',
      };
    case 2:
      return {
        en: 'GRAND FINAL',
        kr: '최후의 결승전',
        sub: '당신의 영원한 이상형이 결정되는 순간',
        code: 'FINAL STAGE // 01 MATCH',
      };
    default:
      return {
        en: `ROUND OF ${roundSize}`,
        kr: `${roundSize}강 토너먼트`,
        sub: '운명의 선택이 시작됩니다',
        code: `STAGE // ${roundSize}`,
      };
  }
};

export const KineticRoundIntro: React.FC<KineticRoundIntroProps> = ({
  roundSize,
  theme,
  onSkip,
}) => {
  if (!roundSize) return null;
  const info = getRoundLabels(roundSize);
  const isFinal = roundSize === 2;

  const accentGradient =
    theme === 'fantasy'
      ? 'from-amber-300 via-rose-300 to-amber-500'
      : theme === 'modern'
      ? 'from-sky-300 via-pink-300 to-indigo-400'
      : theme === 'male_fantasy'
      ? 'from-indigo-300 via-amber-300 to-purple-400'
      : theme === 'male_modern'
      ? 'from-cyan-300 via-purple-300 to-pink-400'
      : 'from-purple-300 via-amber-300 to-pink-400';

  return (
    <AnimatePresence>
      <motion.div
        key={`round-intro-${roundSize}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, filter: 'blur(12px)' }}
        transition={{ duration: 0.25 }}
        onClick={onSkip}
        className="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center overflow-hidden bg-[#05050a]/92 backdrop-blur-xl"
      >
        {/* Top & Bottom Kinetic Marquee Bars */}
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: '0%' }}
          transition={{ type: 'spring', damping: 24, stiffness: 180 }}
          className="absolute top-10 left-0 right-0 flex items-center justify-between border-y border-white/10 bg-white/[0.02] px-8 py-2 font-mono-tech text-[11px] tracking-[0.35em] text-white/40 uppercase"
        >
          <span>{info.code}</span>
          <span>MUSE CUP // KINETIC BROADCAST</span>
          <span>CLICK ANYWHERE TO SKIP</span>
        </motion.div>

        {/* Diagonal Kinetic Slash Line */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-none absolute h-[1px] w-[140vw] -rotate-12 bg-gradient-to-r from-transparent via-amber-400/50 to-transparent"
        />

        {/* Center Badge */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 16, stiffness: 220, delay: 0.05 }}
          className="mb-4 flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium tracking-[0.25em] text-amber-300 uppercase backdrop-blur-md"
        >
          {isFinal ? <Crown className="h-4 w-4 text-amber-400" /> : <Swords className="h-4 w-4 text-amber-400" />}
          <span>{info.code}</span>
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
        </motion.div>

        {/* Giant English Kinetic Title */}
        <div className="overflow-hidden px-4 py-1">
          <motion.h1
            initial={{ y: '110%', skewY: 6 }}
            animate={{ y: '0%', skewY: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 190, delay: 0.08 }}
            className={`font-display bg-gradient-to-r ${accentGradient} bg-clip-text text-center text-5xl font-black tracking-[0.12em] text-transparent sm:text-7xl md:text-8xl`}
          >
            {info.en}
          </motion.h1>
        </div>

        {/* Korean Title & Subtitle */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, delay: 0.18 }}
          className="mt-3 flex flex-col items-center text-center"
        >
          <h2 className="font-serif-kr text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {info.kr}
          </h2>
          <p className="mt-2 max-w-md text-sm text-slate-300/80 sm:text-base">
            {info.sub}
          </p>
        </motion.div>

        {/* Expanding Progress Indicator */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.25, ease: 'linear' }}
          className="mt-8 h-0.5 w-48 origin-left rounded-full bg-gradient-to-r from-amber-400 via-pink-500 to-sky-400"
        />
      </motion.div>
    </AnimatePresence>
  );
};
