import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Castle,
  Building2,
  Crown,
  Play,
  Library,
  CheckCircle2,
  Users,
  Wand2,
  Volume2,
  Globe,
  Sword,
  Heart,
  Layers,
  ExternalLink,
} from 'lucide-react';
import {
  WorldTheme,
  EditionType,
  THEME_METADATA,
  ALL_CHARACTERS,
  Character,
  getCharactersByTheme,
} from '../data/characters';
import { soundEngine } from '../utils/soundEngine';
import type { GlobalStatsResponse } from '../utils/api';

interface LobbyViewProps {
  selectedTheme: WorldTheme;
  selectedRoundSize: number;
  globalStats?: GlobalStatsResponse | null;
  onSelectTheme: (theme: WorldTheme) => void;
  onSelectRoundSize: (size: number) => void;
  onStartTournament: () => void;
  onOpenCodex: () => void;
  onInspectCharacter: (character: Character) => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  selectedTheme,
  selectedRoundSize,
  globalStats,
  onSelectTheme,
  onSelectRoundSize,
  onStartTournament,
  onOpenCodex,
  onInspectCharacter,
}) => {
  const activeMeta = THEME_METADATA[selectedTheme];
  const activeEdition: EditionType = activeMeta.edition || 'heroine';

  const previewCharacters = useMemo(
    () => getCharactersByTheme(selectedTheme),
    [selectedTheme]
  );

  const availableRounds = useMemo(() => {
    if (selectedTheme === 'grand_all') return [64, 32, 16, 8];
    if (selectedTheme === 'all' || selectedTheme === 'all_male') return [32, 16, 8];
    return [16, 8];
  }, [selectedTheme]);

  const handleSelectEdition = (edition: EditionType) => {
    soundEngine.playClick();
    if (edition === 'heroine') {
      onSelectTheme('fantasy');
    } else if (edition === 'hero') {
      onSelectTheme('male_fantasy');
    } else {
      onSelectTheme('grand_all');
    }
  };

  const heroineCards: Array<{
    id: WorldTheme;
    icon: React.ReactNode;
    title: string;
    sub: string;
    badge: string;
    count: number;
    unitLabel: string;
    sampleImgs: string[];
    accent: string;
  }> = [
    {
      id: 'fantasy',
      icon: <Castle className="h-5 w-5 text-amber-400" />,
      title: '서양 중세 판타지 (히로인)',
      sub: '아르카디아 제국 연대기 · 대신전 성녀와 소공녀 16인',
      badge: 'HEROINE · 16강 로판',
      count: 16,
      unitLabel: '히로인 16명 수록',
      sampleImgs: [
        '/images/fantasy/f01.jpg',
        '/images/fantasy/f02.jpg',
        '/images/fantasy/f03.jpg',
        '/images/fantasy/f05.jpg',
      ],
      accent: '#f59e0b',
    },
    {
      id: 'modern',
      icon: <Building2 className="h-5 w-5 text-sky-400" />,
      title: '현대 대한민국 (히로인)',
      sub: '서울 시네마틱 청춘 로맨스 · 첫사랑 선배와 아이돌 16인',
      badge: 'HEROINE · 16강 현대물',
      count: 16,
      unitLabel: '히로인 16명 수록',
      sampleImgs: [
        '/images/modern/m01.jpg',
        '/images/modern/m02.jpg',
        '/images/modern/m03.jpg',
        '/images/modern/m05.jpg',
      ],
      accent: '#38bdf8',
    },
    {
      id: 'all',
      icon: <Crown className="h-5 w-5 text-purple-400" />,
      title: '히로인 차원 통합 올스타전',
      sub: '중세 판타지 히로인 16인 × 현대 서울 히로인 16인',
      badge: 'HEROINE ALL-STARS · 32강',
      count: 32,
      unitLabel: '히로인 32명 수록',
      sampleImgs: [
        '/images/fantasy/f01.jpg',
        '/images/modern/m02.jpg',
        '/images/fantasy/f07.jpg',
        '/images/modern/m13.jpg',
      ],
      accent: '#a855f7',
    },
  ];

  const heroCards: Array<{
    id: WorldTheme;
    icon: React.ReactNode;
    title: string;
    sub: string;
    badge: string;
    count: number;
    unitLabel: string;
    sampleImgs: string[];
    accent: string;
  }> = [
    {
      id: 'male_fantasy',
      icon: <Sword className="h-5 w-5 text-indigo-400" />,
      title: '서양 중세 판타지 (여성향 남주)',
      sub: '제국의 밤과 성좌의 기사단 · 북부 대공·황태자·마탑주 16인',
      badge: 'HERO · 16강 여성향 로판',
      count: 16,
      unitLabel: '남주인공 16명 수록',
      sampleImgs: [
        '/images/male-fantasy/mf01.jpg',
        '/images/male-fantasy/mf02.jpg',
        '/images/male-fantasy/mf03.jpg',
        '/images/male-fantasy/mf05.jpg',
      ],
      accent: '#6366f1',
    },
    {
      id: 'male_modern',
      icon: <Building2 className="h-5 w-5 text-cyan-400" />,
      title: '현대 대한민국 (여성향 남주)',
      sub: '서울 미드나잇 로맨스 · 재벌 후계자·검사·밴드보컬 16인',
      badge: 'HERO · 16강 여성향 현대물',
      count: 16,
      unitLabel: '남주인공 16명 수록',
      sampleImgs: [
        '/images/male-modern/mm01.jpg',
        '/images/male-modern/mm02.jpg',
        '/images/male-modern/mm03.jpg',
        '/images/male-modern/mm05.jpg',
      ],
      accent: '#38bdf8',
    },
    {
      id: 'all_male',
      icon: <Crown className="h-5 w-5 text-pink-400" />,
      title: '히어로 차원 통합 올스타전',
      sub: '중세 판타지 남주 16인 × 현대 서울 남주 16인 격돌',
      badge: 'HERO ALL-STARS · 32강',
      count: 32,
      unitLabel: '남주인공 32명 수록',
      sampleImgs: [
        '/images/male-fantasy/mf01.jpg',
        '/images/male-modern/mm01.jpg',
        '/images/male-fantasy/mf02.jpg',
        '/images/male-modern/mm02.jpg',
      ],
      accent: '#ec4899',
    },
  ];

  const grandCards = [
    {
      id: 'grand_all' as WorldTheme,
      icon: <Layers className="h-5 w-5 text-amber-400" />,
      title: '전 차원 레전드 총결산 : 64강 그랜드 마스터즈',
      sub: '히로인 32인(판타지 16 + 현대 16) + 히어로 32인(판타지 16 + 현대 16) 총출동',
      badge: '64-STAR MULTIVERSE GRAND CUP',
      count: 64,
      unitLabel: '전체 64명 전원 수록',
      sampleImgs: [
        '/images/fantasy/f01.jpg',
        '/images/male-fantasy/mf01.jpg',
        '/images/modern/m02.jpg',
        '/images/male-modern/mm01.jpg',
      ],
      accent: '#f59e0b',
    },
  ];

  const visibleCards =
    activeEdition === 'heroine'
      ? heroineCards
      : activeEdition === 'hero'
      ? heroCards
      : grandCards;

  // Compute top 3 global champions if available
  const topGlobalChars = useMemo(() => {
    if (!globalStats?.stats) return [];
    return ALL_CHARACTERS.map((char) => {
      const st = globalStats.stats[char.id] || { wins: 0, matches: 0, championships: 0 };
      const winRate = st.matches > 0 ? Math.round((st.wins / st.matches) * 100) : 0;
      return { char, ...st, winRate };
    })
      .filter((item) => item.matches > 0 || item.championships > 0)
      .sort((a, b) => {
        if (b.championships !== a.championships) return b.championships - a.championships;
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        return b.wins - a.wins;
      })
      .slice(0, 4);
  }, [globalStats]);

  return (
    <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pt-6 pb-16 sm:px-6 lg:px-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-white/[0.05] to-[#0a0a14]/95 p-6 shadow-2xl sm:p-10">
        {/* Background Editorial Grid */}
        <div className="bg-editorial-grid pointer-events-none absolute inset-0 opacity-60" />

        <div className="relative z-10 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-400/35 bg-amber-400/10 px-4 py-1.5 text-xs font-bold tracking-[0.22em] text-amber-300 uppercase backdrop-blur-md"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>{activeMeta.badge}</span>
            <Wand2 className="h-3.5 w-3.5 text-amber-400" />
          </motion.div>

          <motion.h1
            key={activeMeta.englishTitle}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            className="font-display bg-gradient-to-r from-white via-amber-100 to-amber-300 bg-clip-text text-3xl font-black tracking-[0.12em] text-transparent sm:text-5xl md:text-6xl"
          >
            {activeMeta.englishTitle}
          </motion.h1>

          <motion.h2
            key={activeMeta.name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 font-serif-kr text-xl font-bold text-white sm:text-3xl"
          >
            {activeMeta.name}
          </motion.h2>

          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300/90 sm:text-base">
            {activeMeta.description}
          </p>

          <p className="mt-3 font-serif-kr text-xs text-amber-200/85 italic sm:text-sm">
            {activeMeta.ambientQuote}
          </p>
        </div>

        {/* Edition Switcher Tabs (Heroine vs Hero vs 64-All) */}
        <div className="relative z-10 mt-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono-tech text-xs font-bold tracking-widest text-slate-400 uppercase">
              STEP 01 // SELECT EDITION & WORLDVIEW (에디션 및 세계관 선택)
            </span>
            <a
              href="/architecture.html"
              target="_blank"
              rel="noreferrer"
              onClick={() => soundEngine.playClick()}
              className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-[11px] font-bold text-indigo-300 transition hover:border-indigo-400/60 hover:bg-indigo-500/20"
            >
              <span>시스템 아키텍처 & 인터랙티브 쇼케이스</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => handleSelectEdition('heroine')}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition ${
                activeEdition === 'heroine'
                  ? 'border-amber-400/80 bg-gradient-to-r from-amber-500/20 to-rose-500/15 text-white shadow-lg shadow-amber-500/10'
                  : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25 hover:bg-white/[0.06]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300">
                  <Heart className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-serif-kr text-sm font-black text-white">
                    히로인 에디션 (남성향 32인)
                  </div>
                  <div className="text-[11px] text-slate-400">
                    로판 히로인 16 + 서울 청춘 히로인 16
                  </div>
                </div>
              </div>
              <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 font-mono-tech text-[10px] font-bold text-amber-300">
                32 CHARS
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectEdition('hero')}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition ${
                activeEdition === 'hero'
                  ? 'border-indigo-400/80 bg-gradient-to-r from-indigo-500/25 to-purple-500/20 text-white shadow-lg shadow-indigo-500/15'
                  : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25 hover:bg-white/[0.06]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-400/20 text-indigo-300">
                  <Sword className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-serif-kr text-sm font-black text-white">
                    히어로 에디션 (여성향 32인)
                  </div>
                  <div className="text-[11px] text-slate-400">
                    로판 남주인공 16 + 서울 미드나잇 남주 16
                  </div>
                </div>
              </div>
              <span className="rounded-full bg-indigo-400/20 px-2.5 py-0.5 font-mono-tech text-[10px] font-bold text-indigo-300">
                NEW · 32
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectEdition('grand')}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition ${
                activeEdition === 'grand'
                  ? 'border-purple-400/80 bg-gradient-to-r from-purple-500/25 via-amber-500/15 to-pink-500/20 text-white shadow-lg shadow-purple-500/15'
                  : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25 hover:bg-white/[0.06]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-400/20 text-purple-300">
                  <Crown className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-serif-kr text-sm font-black text-white">
                    전 차원 마스터즈 (통합 64인)
                  </div>
                  <div className="text-[11px] text-slate-400">
                    4개 테마 64인 전체 올스타 토너먼트
                  </div>
                </div>
              </div>
              <span className="rounded-full bg-purple-400/20 px-2.5 py-0.5 font-mono-tech text-[10px] font-bold text-purple-300">
                64 ALL
              </span>
            </button>
          </div>

          <div
            className={`grid grid-cols-1 gap-4 ${
              visibleCards.length === 1 ? 'lg:grid-cols-1' : 'lg:grid-cols-3'
            }`}
          >
            {visibleCards.map((card) => {
              const isSelected = selectedTheme === card.id;
              return (
                <motion.div
                  key={card.id}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.99 }}
                  onMouseEnter={() => soundEngine.playHoverTick()}
                  onClick={() => {
                    soundEngine.playClick();
                    onSelectTheme(card.id);
                  }}
                  className={`group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border p-5 transition-all ${
                    isSelected
                      ? 'border-amber-400/80 bg-white/[0.08] shadow-xl'
                      : 'border-white/10 bg-[#0e0e1a]/80 hover:border-white/25 hover:bg-white/[0.04]'
                  }`}
                  style={{
                    boxShadow: isSelected ? `0 16px 45px -12px ${card.accent}44` : undefined,
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {card.icon}
                        <span className="font-mono-tech text-[11px] font-bold tracking-wider text-slate-300">
                          {card.badge}
                        </span>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="h-5 w-5 text-amber-400" />
                      )}
                    </div>

                    <h3 className="mt-3 font-serif-kr text-xl font-black text-white">
                      {card.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-300/80">{card.sub}</p>
                  </div>

                  {/* Mini Avatar Strip */}
                  <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3.5">
                    <div className="flex -space-x-2.5 overflow-hidden">
                      {card.sampleImgs.map((src, i) => (
                        <img
                          key={i}
                          src={src}
                          alt=""
                          className="inline-block h-10 w-10 rounded-full border-2 border-[#0e0e1a] object-cover object-top"
                        />
                      ))}
                    </div>
                    <span className="font-mono-tech text-xs font-bold text-amber-300">
                      {card.unitLabel}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Step 2: Round Bracket Size & Start CTA */}
        <div className="relative z-10 mt-8 flex flex-col items-center justify-between gap-6 rounded-2xl border border-white/10 bg-black/50 p-5 sm:flex-row sm:px-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-300 uppercase">
              <Users className="h-4 w-4 text-amber-400" />
              <span>STEP 02 // 라운드 규모 선택:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableRounds.map((size) => {
                const active = selectedRoundSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      onSelectRoundSize(size);
                    }}
                    className={`rounded-xl px-4 py-2 font-mono-tech text-xs font-bold transition ${
                      active
                        ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/25'
                        : 'border border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {size}강 토너먼트 ({size / 2}매치 시작)
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center justify-center gap-3 sm:w-auto">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onOpenCodex();
              }}
              className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-3.5 text-sm font-bold text-white transition hover:border-white/40 hover:bg-white/10"
            >
              <Library className="h-4 w-4 text-amber-400" />
              <span>캐릭터 도감 & 글로벌 랭킹 (64인)</span>
            </button>

            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onStartTournament}
              className="flex flex-1 items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-rose-400 px-8 py-3.5 text-base font-black text-slate-950 shadow-xl shadow-amber-500/25 sm:flex-initial"
            >
              <Play className="h-5 w-5 fill-current" />
              <span>{selectedRoundSize}강 이상형 월드컵 시작하기</span>
            </motion.button>
          </div>
        </div>

        {/* Live Cloudflare D1 Global Stats Ticker */}
        {globalStats && (
          <div className="relative z-10 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-950/15 px-5 py-3 text-xs">
            <div className="flex items-center gap-2 text-emerald-300">
              <Globe className="h-4 w-4 animate-pulse text-emerald-400" />
              <span className="font-mono-tech font-bold">
                CLOUDFLARE D1 GLOBAL STATS //
              </span>
              <span className="text-slate-300">
                누적 매치 선택{' '}
                <strong className="font-mono-tech text-white">
                  {globalStats.totalMatches.toLocaleString()}
                </strong>
                회 · 완주된 토너먼트{' '}
                <strong className="font-mono-tech text-white">
                  {globalStats.totalTournaments.toLocaleString()}
                </strong>
                회
              </span>
            </div>

            {topGlobalChars.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-slate-400">실시간 인기 TOP:</span>
                {topGlobalChars.map((item, idx) => (
                  <button
                    key={item.char.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      onInspectCharacter(item.char);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-200 transition hover:border-amber-400/40 hover:text-amber-300"
                  >
                    <span className="font-mono-tech font-bold text-amber-400">
                      #{idx + 1}
                    </span>
                    <span className="font-bold">{item.char.name}</span>
                    <span className="font-mono-tech text-[10px] text-slate-400">
                      ({item.winRate}%)
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Interactive Character Preview Roster */}
      <div className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="font-mono-tech text-xs font-bold tracking-widest text-amber-400 uppercase">
              CONTENDER ROSTER PREVIEW ({previewCharacters.length} CHARACTERS)
            </div>
            <h3 className="mt-1 font-serif-kr text-2xl font-black text-white">
              참전 라인업 미리보기{' '}
              <span className="text-sm font-normal text-slate-400">
                (카드를 클릭하면 상세 배경 서사·시크릿 노트·보이스를 확인할 수 있습니다)
              </span>
            </h3>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Volume2 className="h-3.5 w-3.5 text-amber-400" />
            <span>Web Audio 신디사이저 & 캐릭터 보이스(TTS) 지원</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 lg:grid-cols-8">
          {previewCharacters.map((char, idx) => (
            <motion.div
              key={char.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.02, 0.35) }}
              whileHover={{ y: -5, scale: 1.02 }}
              onMouseEnter={() => soundEngine.playHoverTick(idx * 10)}
              onClick={() => {
                soundEngine.playClick();
                onInspectCharacter(char);
              }}
              className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#10101c] transition hover:border-amber-400/60"
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden">
                <img
                  src={char.image}
                  alt={char.name}
                  className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b0b14] via-transparent to-transparent" />
                <div className="absolute bottom-2 left-2.5 right-2.5">
                  <div
                    className="truncate text-[10px] font-bold"
                    style={{ color: char.accentColor }}
                  >
                    {char.title}
                  </div>
                  <div className="truncate font-serif-kr text-xs font-bold text-white sm:text-sm">
                    {char.name}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
