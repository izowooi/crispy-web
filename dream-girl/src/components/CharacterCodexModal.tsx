import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  Trophy,
  Sparkles,
  Castle,
  Building2,
  Layers,
  Sword,
  Globe,
  Laptop,
} from 'lucide-react';
import {
  ALL_CHARACTERS,
  Character,
  CharacterTheme,
  getCharacterThemeLabel,
} from '../data/characters';
import { soundEngine } from '../utils/soundEngine';

export type StatsMap = Record<
  string,
  { wins: number; matches: number; championships: number }
>;

type CodexFilter = 'all' | CharacterTheme;

interface CharacterCodexModalProps {
  isOpen: boolean;
  onClose: () => void;
  statsMap: StatsMap;
  globalStatsMap?: StatsMap;
  onSelectCharacter: (character: Character) => void;
  initialFilter?: CodexFilter;
}

export const CharacterCodexModal: React.FC<CharacterCodexModalProps> = ({
  isOpen,
  onClose,
  statsMap,
  globalStatsMap,
  onSelectCharacter,
  initialFilter = 'all',
}) => {
  const [filterTheme, setFilterTheme] = useState<CodexFilter>(initialFilter);
  const [sortBy, setSortBy] = useState<'default' | 'ranking'>('default');
  const [statSource, setStatSource] = useState<'global' | 'local'>('global');
  const [searchQuery, setSearchQuery] = useState('');

  const activeStatsMap =
    statSource === 'global' && globalStatsMap && Object.keys(globalStatsMap).length > 0
      ? globalStatsMap
      : statsMap;

  const filteredCharacters = useMemo(() => {
    const list = ALL_CHARACTERS.filter((c) => {
      if (filterTheme !== 'all' && c.theme !== filterTheme) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.englishName.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.faction.toLowerCase().includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });

    if (sortBy === 'ranking') {
      return [...list].sort((a, b) => {
        const sa = activeStatsMap[a.id] || { wins: 0, matches: 0, championships: 0 };
        const sb = activeStatsMap[b.id] || { wins: 0, matches: 0, championships: 0 };
        if (sb.championships !== sa.championships) {
          return sb.championships - sa.championships;
        }
        const rateA = sa.matches > 0 ? sa.wins / sa.matches : 0;
        const rateB = sb.matches > 0 ? sb.wins / sb.matches : 0;
        if (rateB !== rateA) return rateB - rateA;
        return sb.wins - sa.wins;
      });
    }

    return list;
  }, [filterTheme, sortBy, searchQuery, activeStatsMap]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xl"
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#0a0a12] shadow-2xl"
        >
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-white/[0.02] px-6 py-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-amber-400 uppercase">
                <Sparkles className="h-3.5 w-3.5" />
                <span>64-CHARACTER ARCHIVE & GLOBAL HALL OF FAME</span>
              </div>
              <h2 className="mt-0.5 font-serif-kr text-2xl font-black text-white">
                캐릭터 도감 & 명예의 전당 (총 64인 · 4대 세계관)
              </h2>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Global vs Local Stats Toggle */}
              <div className="flex items-center rounded-full border border-white/15 bg-black/60 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setStatSource('global');
                  }}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-bold transition ${
                    statSource === 'global'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span>글로벌 D1 랭킹</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setStatSource('local');
                  }}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-bold transition ${
                    statSource === 'local'
                      ? 'bg-amber-400 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Laptop className="h-3.5 w-3.5" />
                  <span>내 기기 전적</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/75 transition hover:border-white/40 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0d0d17] px-6 py-3.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setFilterTheme('all');
                }}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  filterTheme === 'all'
                    ? 'bg-white text-slate-950'
                    : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>전체 (64)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setFilterTheme('fantasy');
                }}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  filterTheme === 'fantasy'
                    ? 'bg-amber-400 text-slate-950'
                    : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <Castle className="h-3.5 w-3.5" />
                <span>히로인 판타지 (16)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setFilterTheme('modern');
                }}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  filterTheme === 'modern'
                    ? 'bg-sky-400 text-slate-950'
                    : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>히로인 현대 (16)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setFilterTheme('male_fantasy');
                }}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  filterTheme === 'male_fantasy'
                    ? 'bg-indigo-400 text-slate-950'
                    : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <Sword className="h-3.5 w-3.5" />
                <span>여성향 로판 남주 (16)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setFilterTheme('male_modern');
                }}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  filterTheme === 'male_modern'
                    ? 'bg-purple-400 text-slate-950'
                    : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>여성향 현대 남주 (16)</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="이름, 칭호, 소속, #태그 검색..."
                  className="w-52 rounded-full border border-white/15 bg-black/50 py-1.5 pr-3 pl-8 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setSortBy((prev) => (prev === 'default' ? 'ranking' : 'default'));
                }}
                className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                  sortBy === 'ranking'
                    ? 'border-amber-400 bg-amber-400/20 text-amber-300'
                    : 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <Trophy className="h-3.5 w-3.5" />
                <span>{sortBy === 'ranking' ? '승률/우승 랭킹순' : '기본 도감순'}</span>
              </button>
            </div>
          </div>

          {/* Grid */}
          <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredCharacters.map((char, index) => {
              const st = activeStatsMap[char.id] || {
                wins: 0,
                matches: 0,
                championships: 0,
              };
              const winRate = st.matches > 0 ? Math.round((st.wins / st.matches) * 100) : 0;
              const themeLabel = getCharacterThemeLabel(char.theme);

              return (
                <motion.div
                  key={char.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.015, 0.25) }}
                  onClick={() => {
                    soundEngine.playClick();
                    onSelectCharacter(char);
                  }}
                  className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#12121e] transition hover:-translate-y-1 hover:border-white/30"
                >
                  <div className="relative aspect-[3/3.6] w-full overflow-hidden">
                    <img
                      src={char.image}
                      alt={char.name}
                      className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#12121e] via-transparent to-transparent" />

                    {/* Top badges */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold backdrop-blur-md ${themeLabel.badgeClass}`}
                      >
                        {themeLabel.short}
                      </span>
                      {st.championships > 0 && (
                        <span className="flex items-center gap-1 rounded-full border border-amber-400/40 bg-black/75 px-2.5 py-0.5 font-mono-tech text-[10px] font-bold text-amber-300 backdrop-blur-md">
                          <Trophy className="h-3 w-3" />
                          <span>{st.championships}회 우승</span>
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-2 left-3 right-3">
                      <div
                        className="text-[11px] font-bold"
                        style={{ color: char.accentColor }}
                      >
                        {char.title}
                      </div>
                      <div className="font-serif-kr text-lg font-black text-white">
                        {char.name}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col justify-between gap-2 p-3.5">
                    <p className="line-clamp-2 text-xs leading-relaxed text-slate-300/85">
                      {char.backstory}
                    </p>
                    <div className="flex items-center justify-between border-t border-white/10 pt-2 font-mono-tech text-[11px] text-slate-400">
                      <span>{char.mbti} · {char.age}</span>
                      <span className="text-amber-300">
                        승률 {winRate}% ({st.wins}/{st.matches})
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
