import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  MapPin,
  Shield,
  MessageSquareQuote,
  BookOpen,
  Heart,
  CheckCircle2,
  Eye,
  Volume2,
} from 'lucide-react';
import { Character } from '../data/characters';
import { soundEngine } from '../utils/soundEngine';

interface CharacterCardProps {
  character: Character;
  side: 'left' | 'right';
  selectionState: 'idle' | 'selected' | 'eliminated';
  onSelect: (character: Character) => void;
  onInspect: (character: Character, e: React.MouseEvent) => void;
  shortcutKey: string;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  side,
  selectionState,
  onSelect,
  onInspect,
  shortcutKey,
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  const [isHovered, setIsHovered] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || selectionState !== 'idle') return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const px = x / rect.width;
    const py = y / rect.height;

    const rotateY = (px - 0.5) * 11;
    const rotateX = (0.5 - py) * 11;

    setTilt({
      rotateX,
      rotateY,
      glareX: px * 100,
      glareY: py * 100,
    });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    soundEngine.playHoverTick(side === 'left' ? -40 : 40);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  };

  const isSelected = selectionState === 'selected';
  const isEliminated = selectionState === 'eliminated';

  return (
    <motion.div
      ref={cardRef}
      layout
      initial={{
        opacity: 0,
        x: side === 'left' ? -60 : 60,
        scale: 0.94,
      }}
      animate={{
        opacity: isEliminated ? 0.15 : 1,
        x: isSelected ? (side === 'left' ? '18%' : '-18%') : 0,
        scale: isSelected ? 1.05 : isEliminated ? 0.88 : isHovered ? 1.015 : 1,
        filter: isEliminated ? 'grayscale(100%) blur(4px)' : 'grayscale(0%) blur(0px)',
        rotateX: selectionState === 'idle' ? tilt.rotateX : 0,
        rotateY: selectionState === 'idle' ? tilt.rotateY : 0,
      }}
      exit={{
        opacity: 0,
        scale: 0.9,
        transition: { duration: 0.22 },
      }}
      transition={{
        type: 'spring',
        stiffness: 240,
        damping: 24,
        rotateX: { type: 'spring', stiffness: 300, damping: 28 },
        rotateY: { type: 'spring', stiffness: 300, damping: 28 },
      }}
      style={{
        transformStyle: 'preserve-3d',
        perspective: '1200px',
        boxShadow:
          isHovered || isSelected
            ? `0 25px 65px -12px ${character.glowColor}, 0 0 0 1px ${character.accentColor}66`
            : '0 20px 50px -15px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.1)',
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => {
        if (selectionState === 'idle') {
          onSelect(character);
        }
      }}
      className="group relative flex w-full max-w-[500px] cursor-pointer flex-col overflow-hidden rounded-3xl bg-[#0d0d16]/95 transition-colors select-none"
    >
      {/* Dynamic Specular Key/Rim Light Glare */}
      <div
        className="pointer-events-none absolute inset-0 z-30 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(circle 340px at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.14), transparent 75%)`,
        }}
      />

      {/* Selected Winner Kinetic Stamp Overlay */}
      {isSelected && (
        <motion.div
          initial={{ opacity: 0, scale: 1.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/35 backdrop-blur-[2px]"
        >
          <motion.div
            initial={{ rotate: -12, scale: 0.7 }}
            animate={{ rotate: -6, scale: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 16 }}
            className="flex items-center gap-2.5 rounded-2xl border-2 px-6 py-3 shadow-2xl"
            style={{
              borderColor: character.accentColor,
              backgroundColor: 'rgba(8, 8, 16, 0.92)',
              boxShadow: `0 0 40px ${character.glowColor}`,
            }}
          >
            <CheckCircle2 className="h-7 w-7" style={{ color: character.accentColor }} />
            <div className="flex flex-col">
              <span className="font-display text-xl font-black tracking-[0.2em] text-white">
                SELECTED
              </span>
              <span className="text-[11px] font-medium tracking-widest text-amber-300">
                다음 라운드 진출 확정
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Portrait Section (Top 58% of Card) */}
      <div className="relative aspect-[4/4.3] w-full overflow-hidden bg-[#12121f]">
        <img
          src={character.image}
          alt={character.name}
          className="h-full w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
          loading="eager"
        />

        {/* Top Floating Header Badges */}
        <div className="absolute top-3.5 left-3.5 right-3.5 z-20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-black/65 px-3 py-1 text-[11px] font-semibold tracking-wider text-white/95 backdrop-blur-md">
            <Shield className="h-3 w-3" style={{ color: character.accentColor }} />
            <span>{character.faction}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="rounded-full border border-white/15 bg-black/65 px-2.5 py-1 font-mono-tech text-[11px] font-bold text-amber-300 backdrop-blur-md">
              {character.mbti} · {character.age}
            </span>
            <button
              type="button"
              onClick={(e) => onInspect(character, e)}
              title="캐릭터 상세 프로필 및 일러스트 크게 보기"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/65 text-white/80 transition hover:border-amber-400 hover:bg-amber-500/20 hover:text-white backdrop-blur-md"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Keyboard Shortcut Pill */}
        <div className="absolute bottom-3 right-3.5 z-20 hidden items-center gap-1 rounded-lg border border-white/15 bg-black/70 px-2.5 py-1 font-mono-tech text-[10px] tracking-wider text-white/75 backdrop-blur-md sm:flex">
          <span>KEY</span>
          <kbd className="rounded bg-white/15 px-1.5 py-0.5 font-bold text-amber-300">
            {shortcutKey}
          </kbd>
        </div>

        {/* Gradient Fade into Lore Section */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0d0d16] via-[#0d0d16]/75 to-transparent" />

        {/* Title & Name Overlay on Portrait Bottom */}
        <div className="absolute bottom-2.5 left-4 right-16 z-20 flex flex-col">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: character.accentColor }} />
            <span
              className="text-xs font-bold tracking-wider uppercase"
              style={{ color: character.accentColor }}
            >
              {character.title}
            </span>
          </div>
          <div className="mt-0.5 flex items-baseline gap-2.5">
            <h3 className="font-serif-kr text-2xl font-black tracking-tight text-white drop-shadow-md sm:text-[26px]">
              {character.name}
            </h3>
            <span className="font-display truncate text-xs font-medium tracking-wider text-white/50">
              {character.englishName}
            </span>
          </div>
        </div>
      </div>

      {/* Lore, Setting & Quote Section (Bottom 42% of Card) */}
      <div className="relative z-20 flex flex-1 flex-col justify-between gap-2.5 px-4 pt-1 pb-4 sm:px-5">
        {/* Location & Role Subbar */}
        <div className="flex flex-wrap items-center justify-between gap-1 border-b border-white/10 pb-2 text-xs text-slate-300/85">
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-400/90" />
            <span className="truncate">{character.location}</span>
          </div>
          <span className="font-medium text-white/60">{character.role}</span>
        </div>

        {/* Personality Tags */}
        <div className="flex flex-wrap gap-1.5">
          {character.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-slate-200 transition group-hover:border-white/20"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Signature Voice Quote Box */}
        <div
          className="relative rounded-xl border bg-white/[0.03] px-3.5 py-2.5 transition-colors"
          style={{
            borderColor: isHovered ? `${character.accentColor}55` : 'rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <MessageSquareQuote
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{ color: character.accentColor }}
              />
              <p className="font-serif-kr text-xs leading-relaxed font-medium text-amber-100/95 italic sm:text-[13px]">
                {character.quote}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const started = soundEngine.speakQuote(character, () => setIsSpeaking(false));
                setIsSpeaking(started);
              }}
              title="시그니처 대사 보이스 듣기 (TTS)"
              className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold transition ${
                isSpeaking
                  ? 'border-amber-400 bg-amber-400/20 text-amber-300'
                  : 'border-white/15 bg-white/5 text-slate-300 hover:border-amber-400/50 hover:text-white'
              }`}
            >
              <Volume2 className={`h-3 w-3 ${isSpeaking ? 'animate-pulse text-amber-300' : ''}`} />
              <span>{isSpeaking ? '재생중' : '보이스'}</span>
            </button>
          </div>
        </div>

        {/* Character Backstory / Secret Note Toggle */}
        <div className="rounded-xl bg-black/40 p-3 border border-white/5">
          <div className="mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              <BookOpen className="h-3 w-3" style={{ color: character.accentColor }} />
              {showSecret ? '히든 시크릿 설정 (SECRET NOTE)' : '캐릭터 배경 서사 (BACKSTORY)'}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                soundEngine.playClick();
                setShowSecret((prev) => !prev);
              }}
              className="rounded border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-amber-300 transition hover:bg-white/15"
            >
              {showSecret ? '배경 서사 보기' : '시크릿 설정 보기 ✦'}
            </button>
          </div>
          <p className="text-xs leading-relaxed text-slate-300/90 sm:text-[13px]">
            {showSecret ? character.secretNote : character.backstory}
          </p>
        </div>

        {/* Mini Stat Bar & Select CTA */}
        <div className="mt-1 flex items-center justify-between gap-3 pt-1">
          <div className="flex flex-1 items-center gap-3 text-[11px] text-slate-400">
            <div className="flex items-center gap-1">
              <span>매력</span>
              <span className="font-mono-tech font-bold text-white">{character.stats.charm}</span>
            </div>
            <div className="h-2.5 w-[1px] bg-white/15" />
            <div className="flex items-center gap-1">
              <span>애정</span>
              <span className="font-mono-tech font-bold text-white">{character.stats.affection}</span>
            </div>
            <div className="h-2.5 w-[1px] bg-white/15" />
            <div className="flex items-center gap-1">
              <span>아우라</span>
              <span className="font-mono-tech font-bold text-white">{character.stats.aura}</span>
            </div>
          </div>

          <div
            className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold text-slate-950 shadow-lg transition-transform group-hover:scale-105"
            style={{
              backgroundColor: character.accentColor,
              boxShadow: `0 4px 20px ${character.glowColor}`,
            }}
          >
            <Heart className="h-3.5 w-3.5 fill-current" />
            <span>이상형 선택</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
