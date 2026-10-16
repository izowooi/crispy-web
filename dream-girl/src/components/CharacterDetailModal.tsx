import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  MapPin,
  Shield,
  MessageSquareQuote,
  BookOpen,
  Lock,
  Trophy,
  Volume2,
  Globe,
} from 'lucide-react';
import { Character, getCharacterThemeLabel } from '../data/characters';
import { soundEngine } from '../utils/soundEngine';

interface CharacterDetailModalProps {
  character: Character | null;
  onClose: () => void;
  winStats?: { wins: number; matches: number; championships: number };
  globalStats?: { wins: number; matches: number; championships: number };
}

export const CharacterDetailModal: React.FC<CharacterDetailModalProps> = ({
  character,
  onClose,
  winStats,
  globalStats,
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  if (!character) return null;

  const themeInfo = getCharacterThemeLabel(character.theme);

  const statItems = [
    { label: '매력도 (CHARM)', value: character.stats.charm },
    { label: '애정도 (AFFECTION)', value: character.stats.affection },
    { label: '지성/책략 (INTELLECT)', value: character.stats.intellect },
    { label: '기품/아우라 (AURA)', value: character.stats.aura },
    { label: '신비도 (MYSTERY)', value: character.stats.mystery },
  ];

  const winRate =
    winStats && winStats.matches > 0
      ? Math.round((winStats.wins / winStats.matches) * 100)
      : 0;

  const globalWinRate =
    globalStats && globalStats.matches > 0
      ? Math.round((globalStats.wins / globalStats.matches) * 100)
      : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => {
          soundEngine.stopSpeech();
          onClose();
        }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xl"
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 24 }}
          transition={{ type: 'spring', damping: 24, stiffness: 260 }}
          onClick={(e) => e.stopPropagation()}
          className="relative grid max-h-[90vh] w-full max-w-4xl grid-cols-1 overflow-y-auto rounded-3xl border border-white/15 bg-[#0b0b14] shadow-2xl md:grid-cols-12"
          style={{
            boxShadow: `0 25px 80px -15px ${character.glowColor}`,
          }}
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={() => {
              soundEngine.stopSpeech();
              onClose();
            }}
            className="absolute top-4 right-4 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/70 text-white/80 transition hover:border-white/40 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Left Column: High-Res Illustration */}
          <div className="relative min-h-[380px] md:col-span-5">
            <img
              src={character.image}
              alt={character.name}
              className="h-full w-full object-cover object-top"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b0b14] via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-[#0b0b14]" />

            <div className="absolute top-4 left-4">
              <span
                className={`rounded-full border px-3 py-1 font-mono-tech text-[10px] font-bold backdrop-blur-md ${themeInfo.badgeClass}`}
              >
                {themeInfo.short}
              </span>
            </div>

            <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
              <span
                className="rounded-full px-3 py-1 font-mono-tech text-[11px] font-bold text-slate-950 shadow-lg"
                style={{ backgroundColor: character.accentColor }}
              >
                {character.badgeText}
              </span>
              <span className="rounded-full border border-white/20 bg-black/70 px-3 py-1 font-mono-tech text-xs font-semibold text-white backdrop-blur-md">
                {character.mbti} · {character.age}
              </span>
            </div>
          </div>

          {/* Right Column: Editorial Profile & Lore */}
          <div className="flex flex-col justify-between gap-4 p-6 sm:p-8 md:col-span-7">
            <div>
              <div
                className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase"
                style={{ color: character.accentColor }}
              >
                <Sparkles className="h-4 w-4" />
                <span>{character.title}</span>
              </div>

              <h2 className="mt-1 font-serif-kr text-3xl font-black text-white sm:text-4xl">
                {character.name}
              </h2>
              <p className="font-display text-sm tracking-widest text-white/45 uppercase">
                {character.englishName}
              </p>

              {/* Faction & Location Metadata */}
              <div className="mt-4 grid grid-cols-1 gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 text-xs text-slate-300 sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 shrink-0" style={{ color: character.accentColor }} />
                  <div>
                    <div className="text-[10px] text-white/40 uppercase">FACTION / ROLE</div>
                    <div className="font-semibold text-white">
                      {character.faction} · {character.role}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0" style={{ color: character.accentColor }} />
                  <div>
                    <div className="text-[10px] text-white/40 uppercase">STAGE / SETTING</div>
                    <div className="font-semibold text-white">{character.location}</div>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {character.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Quote + TTS Button */}
              <div
                className="mt-4 rounded-2xl border bg-white/[0.03] p-4"
                style={{ borderColor: `${character.accentColor}44` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <MessageSquareQuote
                      className="mt-0.5 h-5 w-5 shrink-0"
                      style={{ color: character.accentColor }}
                    />
                    <p className="font-serif-kr text-sm leading-relaxed font-medium text-amber-100 italic">
                      {character.quote}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const started = soundEngine.speakQuote(character, () =>
                        setIsSpeaking(false)
                      );
                      setIsSpeaking(started);
                    }}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                      isSpeaking
                        ? 'border-amber-400 bg-amber-400/20 text-amber-300'
                        : 'border-white/15 bg-white/5 text-slate-200 hover:border-amber-400/50 hover:text-white'
                    }`}
                  >
                    <Volume2 className={`h-3.5 w-3.5 ${isSpeaking ? 'animate-pulse text-amber-300' : ''}`} />
                    <span>{isSpeaking ? '보이스 정지' : '대사 듣기'}</span>
                  </button>
                </div>
              </div>

              {/* Backstory */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-400 uppercase">
                  <BookOpen className="h-3.5 w-3.5" style={{ color: character.accentColor }} />
                  <span>배경 서사 (CHARACTER LORE)</span>
                </div>
                <p className="text-sm leading-relaxed text-slate-300">
                  {character.backstory}
                </p>
              </div>

              {/* Secret Note */}
              <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-500/[0.06] p-3.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <Lock className="h-3.5 w-3.5" />
                  <span>히든 비하인드 설정 (SECRET LORE)</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-amber-100/90">
                  {character.secretNote}
                </p>
              </div>
            </div>

            {/* Stats & Win Record */}
            <div className="border-t border-white/10 pt-4">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {statItems.map((st) => (
                  <div key={st.label} className="space-y-1">
                    <div className="flex justify-between font-mono-tech text-[11px]">
                      <span className="text-slate-400">{st.label}</span>
                      <span className="font-bold text-white">{st.value}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${st.value}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: character.accentColor }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {globalStats && (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-500/25 bg-emerald-950/20 px-3.5 py-2 text-xs">
                    <div className="flex items-center gap-1.5 text-emerald-300">
                      <Globe className="h-3.5 w-3.5" />
                      <span className="font-semibold">글로벌 우승 {globalStats.championships}회</span>
                    </div>
                    <div className="font-mono-tech text-slate-300">
                      승률 <strong className="text-white">{globalWinRate}%</strong> ({globalStats.wins}/{globalStats.matches})
                    </div>
                  </div>
                )}

                {winStats && (
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2 text-xs">
                    <div className="flex items-center gap-1.5 text-amber-300">
                      <Trophy className="h-3.5 w-3.5" />
                      <span className="font-semibold">내 기기 우승 {winStats.championships}회</span>
                    </div>
                    <div className="font-mono-tech text-slate-300">
                      승률 <strong className="text-white">{winRate}%</strong> ({winStats.wins}/{winStats.matches})
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
