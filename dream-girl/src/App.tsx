import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Swords,
  Library,
  Volume2,
  VolumeX,
  Music,
  Undo2,
  Home,
  Shuffle,
  Crown,
} from 'lucide-react';
import {
  Character,
  WorldTheme,
  ALL_CHARACTERS,
  THEME_METADATA,
  getCharactersByTheme,
} from './data/characters';
import { AmbientStageCanvas } from './components/AmbientStageCanvas';
import { KineticRoundIntro, getRoundLabels } from './components/KineticRoundIntro';
import { CharacterCard } from './components/CharacterCard';
import { CharacterDetailModal } from './components/CharacterDetailModal';
import { CharacterCodexModal, StatsMap } from './components/CharacterCodexModal';
import { BracketModal, MatchRecord } from './components/BracketModal';
import { WinnerShowcase } from './components/WinnerShowcase';
import { LobbyView } from './components/LobbyView';
import { soundEngine } from './utils/soundEngine';
import {
  fetchGlobalStats,
  recordGlobalVote,
  recordGlobalTournamentComplete,
  fetchSharedResult,
  GlobalStatsResponse,
} from './utils/api';

type GamePhase = 'lobby' | 'playing' | 'winner';

interface UndoSnapshot {
  roundPool: Character[];
  nextRoundPool: Character[];
  matchIndex: number;
  history: MatchRecord[];
  semifinalists: Character[];
}

const STATS_STORAGE_KEY = 'dream-girl-world-cup-stats-v1';

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const App: React.FC = () => {
  // Game configuration
  const [selectedTheme, setSelectedTheme] = useState<WorldTheme>('fantasy');
  const [selectedRoundSize, setSelectedRoundSize] = useState<number>(16);
  const [phase, setPhase] = useState<GamePhase>('lobby');
  const [isSharedView, setIsSharedView] = useState<boolean>(false);

  // Tournament state
  const [roundPool, setRoundPool] = useState<Character[]>([]);
  const [nextRoundPool, setNextRoundPool] = useState<Character[]>([]);
  const [matchIndex, setMatchIndex] = useState<number>(0);
  const [history, setHistory] = useState<MatchRecord[]>([]);
  const [undoStack, setUndoStack] = useState<UndoSnapshot[]>([]);
  const [winner, setWinner] = useState<Character | null>(null);
  const [runnerUp, setRunnerUp] = useState<Character | null>(null);
  const [semifinalists, setSemifinalists] = useState<Character[]>([]);

  // Choreographed motion states
  const [roundIntroSize, setRoundIntroSize] = useState<number | null>(null);
  const [selectionSide, setSelectionSide] = useState<'idle' | 'left' | 'right'>('idle');

  // Modals & Audio state
  const [inspectedChar, setInspectedChar] = useState<Character | null>(null);
  const [isCodexOpen, setIsCodexOpen] = useState<boolean>(false);
  const [isBracketOpen, setIsBracketOpen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isBgmOn, setIsBgmOn] = useState<boolean>(false);

  // Global Cloudflare D1 Stats
  const [globalStats, setGlobalStats] = useState<GlobalStatsResponse | null>(null);

  const refreshGlobalStats = useCallback(async () => {
    const data = await fetchGlobalStats();
    if (data && data.ok) {
      setGlobalStats(data);
    }
  }, []);

  // Load Global D1 stats & check URL for ?share=<id> or ?theme=<theme>
  useEffect(() => {
    refreshGlobalStats();

    const params = new URLSearchParams(window.location.search);
    const shareId = params.get('share');
    const themeParam = params.get('theme') as WorldTheme | null;

    if (themeParam && THEME_METADATA[themeParam]) {
      setSelectedTheme(themeParam);
      if (themeParam === 'grand_all') setSelectedRoundSize(64);
      else if (themeParam === 'all' || themeParam === 'all_male') setSelectedRoundSize(32);
    }

    if (shareId) {
      fetchSharedResult(shareId).then((shared) => {
        if (!shared) return;
        const charMap = new Map(ALL_CHARACTERS.map((c) => [c.id, c]));
        const w = charMap.get(shared.winnerId);
        if (!w) return;
        const r = shared.runnerUpId ? charMap.get(shared.runnerUpId) || null : null;
        const sfs = (shared.semifinalistIds || [])
          .map((id) => charMap.get(id))
          .filter((c): c is Character => Boolean(c));
        const hist: MatchRecord[] = (shared.history || [])
          .map((h, idx) => {
            const left = charMap.get(h.leftId);
            const right = charMap.get(h.rightId);
            const win = charMap.get(h.winnerId);
            if (!left || !right || !win) return null;
            return {
              roundSize: h.roundSize,
              matchIndex: h.matchNumber || idx + 1,
              left,
              right,
              winner: win,
            };
          })
          .filter((item): item is MatchRecord => Boolean(item));

        if (shared.theme && THEME_METADATA[shared.theme]) {
          setSelectedTheme(shared.theme);
        }
        if (shared.roundSize) {
          setSelectedRoundSize(shared.roundSize);
        }
        setWinner(w);
        setRunnerUp(r);
        setSemifinalists(sfs);
        setHistory(hist);
        setIsSharedView(true);
        setPhase('winner');
      });
    }
  }, [refreshGlobalStats]);

  // Persistent Local Hall of Fame Stats
  const [statsMap, setStatsMap] = useState<StatsMap>(() => {
    try {
      const raw = localStorage.getItem(STATS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const recordStat = useCallback(
    (winnerId: string, loserId: string, isFinalChampionship: boolean) => {
      setStatsMap((prev) => {
        const next = { ...prev };
        const w = next[winnerId] || { wins: 0, matches: 0, championships: 0 };
        const l = next[loserId] || { wins: 0, matches: 0, championships: 0 };

        next[winnerId] = {
          wins: w.wins + 1,
          matches: w.matches + 1,
          championships: w.championships + (isFinalChampionship ? 1 : 0),
        };
        next[loserId] = {
          wins: l.wins,
          matches: l.matches + 1,
          championships: l.championships,
        };

        try {
          localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore storage quota errors
        }
        return next;
      });
    },
    []
  );

  // Auto-dismiss kinetic round intro after 1.35 seconds
  useEffect(() => {
    if (!roundIntroSize) return;
    const timer = window.setTimeout(() => {
      setRoundIntroSize(null);
    }, 1350);
    return () => clearTimeout(timer);
  }, [roundIntroSize]);

  // Handle Theme Change in Lobby
  const handleSelectTheme = (theme: WorldTheme) => {
    setSelectedTheme(theme);
    soundEngine.setTheme(theme);
    if (theme === 'grand_all') {
      setSelectedRoundSize(64);
    } else if (theme === 'all' || theme === 'all_male') {
      setSelectedRoundSize(32);
    } else if (selectedRoundSize > 16) {
      setSelectedRoundSize(16);
    }
  };

  // Start Tournament with given theme & round size
  const startTournamentWithConfig = useCallback(
    (themeToUse: WorldTheme, sizeToUse: number) => {
      soundEngine.setTheme(themeToUse);
      soundEngine.stopSpeech();
      soundEngine.playRoundTransition();

      // Clear ?share= param if present
      if (window.location.search.includes('share=')) {
        window.history.replaceState({}, '', window.location.pathname);
      }

      const sourceRoster = getCharactersByTheme(themeToUse);
      const effectiveSize = Math.min(sizeToUse, sourceRoster.length);
      const shuffled = shuffleArray(sourceRoster).slice(0, effectiveSize);

      setSelectedTheme(themeToUse);
      setSelectedRoundSize(effectiveSize);
      setRoundPool(shuffled);
      setNextRoundPool([]);
      setMatchIndex(0);
      setHistory([]);
      setUndoStack([]);
      setWinner(null);
      setRunnerUp(null);
      setSemifinalists([]);
      setSelectionSide('idle');
      setIsSharedView(false);
      setPhase('playing');
      setRoundIntroSize(effectiveSize);
    },
    []
  );

  // Current Contenders
  const leftContender =
    phase === 'playing' ? roundPool[matchIndex * 2] || null : null;
  const rightContender =
    phase === 'playing' ? roundPool[matchIndex * 2 + 1] || null : null;
  const totalMatchesInRound = Math.floor(roundPool.length / 2);
  const currentRoundSize = roundPool.length;

  // Handle selecting a contender in the current match
  const handlePickCharacter = useCallback(
    (chosen: Character) => {
      if (
        phase !== 'playing' ||
        selectionSide !== 'idle' ||
        roundIntroSize !== null ||
        !leftContender ||
        !rightContender
      ) {
        return;
      }

      const side = chosen.id === leftContender.id ? 'left' : 'right';
      const defeated = side === 'left' ? rightContender : leftContender;

      soundEngine.stopSpeech();
      soundEngine.playCardSelect();
      setSelectionSide(side);

      // Save undo snapshot
      setUndoStack((prev) => [
        ...prev,
        {
          roundPool,
          nextRoundPool,
          matchIndex,
          history,
          semifinalists,
        },
      ]);

      const isFinalMatch = currentRoundSize === 2;
      recordStat(chosen.id, defeated.id, isFinalMatch);

      // Record vote asynchronously to Cloudflare D1
      recordGlobalVote({
        winnerId: chosen.id,
        loserId: defeated.id,
        theme: selectedTheme,
        roundSize: currentRoundSize,
      });

      // Wait 580ms for the match-cut spring animation before advancing
      window.setTimeout(() => {
        const updatedNextPool = [...nextRoundPool, chosen];
        const newRecord: MatchRecord = {
          roundSize: currentRoundSize,
          matchIndex: matchIndex + 1,
          left: leftContender,
          right: rightContender,
          winner: chosen,
        };
        const updatedHistory = [...history, newRecord];

        // Track semifinal losers for the podium
        let updatedSemifinalists = semifinalists;
        if (currentRoundSize === 4) {
          updatedSemifinalists = [...semifinalists, defeated];
        }

        setHistory(updatedHistory);
        setSemifinalists(updatedSemifinalists);

        if (matchIndex + 1 < totalMatchesInRound) {
          // Advance to next match in the same round
          setNextRoundPool(updatedNextPool);
          setMatchIndex(matchIndex + 1);
          setSelectionSide('idle');
        } else {
          // Round finished!
          if (updatedNextPool.length === 1) {
            // Tournament finished -> Crown Grand Champion!
            setWinner(chosen);
            setRunnerUp(defeated);
            setSelectionSide('idle');
            setPhase('winner');

            recordGlobalTournamentComplete({
              winnerId: chosen.id,
              runnerUpId: defeated.id,
              semifinalistIds: updatedSemifinalists.map((s) => s.id),
              theme: selectedTheme,
              roundSize: selectedRoundSize,
            }).then(() => {
              refreshGlobalStats();
            });
          } else {
            // Advance to next round (e.g., 64 -> 32 -> 16 -> 8 -> 4 -> 2)
            const nextRoundShuffled = shuffleArray(updatedNextPool);
            setRoundPool(nextRoundShuffled);
            setNextRoundPool([]);
            setMatchIndex(0);
            setSelectionSide('idle');
            soundEngine.playRoundTransition();
            setRoundIntroSize(nextRoundShuffled.length);
          }
        }
      }, 580);
    },
    [
      phase,
      selectionSide,
      roundIntroSize,
      leftContender,
      rightContender,
      roundPool,
      nextRoundPool,
      matchIndex,
      history,
      semifinalists,
      currentRoundSize,
      totalMatchesInRound,
      selectedTheme,
      selectedRoundSize,
      recordStat,
      refreshGlobalStats,
    ]
  );

  // Undo last pick
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0 || selectionSide !== 'idle') return;
    soundEngine.playClick();
    const last = undoStack[undoStack.length - 1];
    setRoundPool(last.roundPool);
    setNextRoundPool(last.nextRoundPool);
    setMatchIndex(last.matchIndex);
    setHistory(last.history);
    setSemifinalists(last.semifinalists);
    setUndoStack((prev) => prev.slice(0, -1));
  }, [undoStack, selectionSide]);

  // Keyboard shortcuts for fast & responsive gameplay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isCodexOpen || isBracketOpen || inspectedChar) {
        if (e.key === 'Escape') {
          setInspectedChar(null);
          setIsCodexOpen(false);
          setIsBracketOpen(false);
        }
        return;
      }

      if (phase === 'playing') {
        if (roundIntroSize !== null) {
          if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') {
            setRoundIntroSize(null);
          }
          return;
        }

        if (
          (e.key === 'ArrowLeft' || e.key === '1' || e.key === 'a' || e.key === 'A') &&
          leftContender
        ) {
          e.preventDefault();
          handlePickCharacter(leftContender);
        } else if (
          (e.key === 'ArrowRight' || e.key === '2' || e.key === 'd' || e.key === 'D') &&
          rightContender
        ) {
          e.preventDefault();
          handlePickCharacter(rightContender);
        } else if (e.key === 'z' || e.key === 'Z' || e.key === 'Backspace') {
          e.preventDefault();
          handleUndo();
        } else if (e.key === 'b' || e.key === 'B') {
          e.preventDefault();
          setIsBracketOpen((prev) => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    phase,
    roundIntroSize,
    leftContender,
    rightContender,
    isCodexOpen,
    isBracketOpen,
    inspectedChar,
    handlePickCharacter,
    handleUndo,
  ]);

  const roundProgressPercent =
    totalMatchesInRound > 0
      ? Math.round(((matchIndex + 1) / totalMatchesInRound) * 100)
      : 0;

  return (
    <div className="relative flex min-h-screen flex-col bg-[#06060c] text-white">
      {/* Dynamic Atmospheric Stage Canvas */}
      <AmbientStageCanvas
        leftColor={
          phase === 'playing' && leftContender
            ? leftContender.accentColor
            : phase === 'winner' && winner
            ? winner.accentColor
            : THEME_METADATA[selectedTheme].primaryColor
        }
        rightColor={
          phase === 'playing' && rightContender
            ? rightContender.accentColor
            : phase === 'winner' && winner
            ? winner.accentColor
            : THEME_METADATA[selectedTheme].secondaryColor
        }
        theme={selectedTheme}
      />

      {/* Kinetic Round Intro Overlay */}
      {phase === 'playing' && roundIntroSize !== null && (
        <KineticRoundIntro
          roundSize={roundIntroSize}
          theme={selectedTheme}
          onSkip={() => setRoundIntroSize(null)}
        />
      )}

      {/* Top Sticky Broadcast Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07070e]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                soundEngine.stopSpeech();
                setIsSharedView(false);
                setPhase('lobby');
              }}
              className="group flex items-center gap-2.5 text-left"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-400/40 bg-gradient-to-br from-amber-400/20 to-rose-500/20 shadow-inner transition group-hover:scale-105">
                <Crown className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-sm font-black tracking-[0.18em] text-white sm:text-base">
                    MUSE CUP
                  </span>
                  <span className="hidden rounded bg-amber-400/15 px-1.5 py-0.5 font-mono-tech text-[10px] font-bold text-amber-300 sm:inline-block">
                    64-STAR EDITION
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {THEME_METADATA[selectedTheme].name}
                </p>
              </div>
            </button>
          </div>

          {/* Center: Live Round Progress Pill when Playing */}
          {phase === 'playing' && currentRoundSize > 0 && (
            <div className="hidden flex-col items-center md:flex">
              <div className="flex items-center gap-2.5">
                <span className="rounded-full bg-amber-400 px-2.5 py-0.5 font-mono-tech text-xs font-black text-slate-950">
                  {currentRoundSize === 2 ? '결승전 FINAL' : `${currentRoundSize}강`}
                </span>
                <span className="font-serif-kr text-sm font-bold text-white">
                  {getRoundLabels(currentRoundSize).kr}
                </span>
                <span className="font-mono-tech text-xs font-bold text-amber-300">
                  MATCH {String(matchIndex + 1).padStart(2, '0')} /{' '}
                  {String(totalMatchesInRound).padStart(2, '0')}
                </span>
              </div>
              <div className="mt-1.5 h-1 w-52 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 via-rose-400 to-sky-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${roundProgressPercent}%` }}
                  transition={{ type: 'spring', stiffness: 200, damping: 24 }}
                />
              </div>
            </div>
          )}

          {/* Right: Controls & Modals */}
          <div className="flex items-center gap-2">
            {phase === 'playing' && (
              <>
                <button
                  type="button"
                  disabled={undoStack.length === 0 || selectionSide !== 'idle'}
                  onClick={handleUndo}
                  title="이전 선택 되돌리기 (단축키 Z)"
                  className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <Undo2 className="h-3.5 w-3.5 text-amber-400" />
                  <span className="hidden sm:inline">되돌리기</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setIsBracketOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/10"
                >
                  <Swords className="h-3.5 w-3.5 text-amber-400" />
                  <span className="hidden sm:inline">대진표</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                refreshGlobalStats();
                setIsCodexOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/10"
            >
              <Library className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden sm:inline">도감/랭킹</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const playing = soundEngine.toggleBgm();
                setIsBgmOn(playing);
              }}
              title="배경 앰비언트 신스 사운드트랙 켜기/끄기"
              className={`flex h-8 w-8 items-center justify-center rounded-full border transition ${
                isBgmOn
                  ? 'border-amber-400 bg-amber-400/20 text-amber-300'
                  : 'border-white/15 bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <Music className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                const nextMute = !isMuted;
                setIsMuted(nextMute);
                soundEngine.setMuted(nextMute);
                if (nextMute) setIsBgmOn(false);
              }}
              title="효과음 음소거 켜기/끄기"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-slate-300 transition hover:border-white/30 hover:text-white"
            >
              {isMuted ? (
                <VolumeX className="h-3.5 w-3.5 text-rose-400" />
              ) : (
                <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
              )}
            </button>

            {phase !== 'lobby' && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  soundEngine.stopSpeech();
                  setIsSharedView(false);
                  setPhase('lobby');
                }}
                title="메인 테마 선택 화면으로 이동"
                className="flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/15 hover:text-white"
              >
                <Home className="h-3.5 w-3.5" />
                <span className="hidden md:inline">테마 변경</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Stage */}
      <main className="relative z-10 flex flex-1 flex-col justify-center">
        {phase === 'lobby' && (
          <LobbyView
            selectedTheme={selectedTheme}
            selectedRoundSize={selectedRoundSize}
            globalStats={globalStats}
            onSelectTheme={handleSelectTheme}
            onSelectRoundSize={setSelectedRoundSize}
            onStartTournament={() =>
              startTournamentWithConfig(selectedTheme, selectedRoundSize)
            }
            onOpenCodex={() => {
              refreshGlobalStats();
              setIsCodexOpen(true);
            }}
            onInspectCharacter={(char) => setInspectedChar(char)}
          />
        )}

        {phase === 'playing' && leftContender && rightContender && (
          <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-4 py-4 sm:px-6 lg:py-6">
            {/* Mobile Round Indicator */}
            <div className="mb-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 md:hidden">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-amber-400 px-2.5 py-0.5 font-mono-tech text-xs font-black text-slate-950">
                  {currentRoundSize === 2 ? '결승전' : `${currentRoundSize}강`}
                </span>
                <span className="font-serif-kr text-xs font-bold text-white">
                  {getRoundLabels(currentRoundSize).kr}
                </span>
              </div>
              <span className="font-mono-tech text-xs font-bold text-amber-300">
                {matchIndex + 1} / {totalMatchesInRound}
              </span>
            </div>

            {/* Dual Contender Arena */}
            <div className="relative flex flex-col items-center justify-center gap-6 lg:flex-row lg:items-stretch lg:gap-10">
              <AnimatePresence mode="wait">
                <CharacterCard
                  key={`left-${leftContender.id}`}
                  character={leftContender}
                  side="left"
                  selectionState={
                    selectionSide === 'idle'
                      ? 'idle'
                      : selectionSide === 'left'
                      ? 'selected'
                      : 'eliminated'
                  }
                  onSelect={handlePickCharacter}
                  onInspect={(c, e) => {
                    e.stopPropagation();
                    soundEngine.playClick();
                    setInspectedChar(c);
                  }}
                  shortcutKey="← / 1"
                />
              </AnimatePresence>

              {/* Center Kinetic VS Emblem & Quick Randomizer */}
              <div className="z-30 flex flex-row items-center justify-center gap-4 lg:flex-col lg:justify-center">
                <div className="hidden h-20 w-[1px] bg-gradient-to-b from-transparent via-white/25 to-amber-400/60 lg:block" />

                <motion.div
                  key={`vs-${currentRoundSize}-${matchIndex}`}
                  initial={{ scale: 0.6, rotate: -15, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                  className="relative flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl border border-amber-400/50 bg-[#0d0d18] shadow-2xl shadow-amber-500/20 sm:h-20 sm:w-20"
                >
                  <div className="animate-pulse-glow pointer-events-none absolute -inset-2 rounded-3xl bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-sky-500/20 blur-md" />
                  <span className="font-display text-xl font-black tracking-widest text-amber-300 sm:text-2xl">
                    VS
                  </span>
                  <span className="font-mono-tech text-[9px] font-bold tracking-widest text-white/50">
                    M#{matchIndex + 1}
                  </span>
                </motion.div>

                <button
                  type="button"
                  disabled={selectionSide !== 'idle'}
                  onClick={() => {
                    const pick =
                      Math.random() < 0.5 ? leftContender : rightContender;
                    handlePickCharacter(pick);
                  }}
                  title="운명에 맡기기 (랜덤 선택)"
                  className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:border-amber-400/50 hover:bg-amber-400/15 hover:text-amber-200"
                >
                  <Shuffle className="h-3 w-3 text-amber-400" />
                  <span>운명 랜덤</span>
                </button>

                <div className="hidden h-20 w-[1px] bg-gradient-to-t from-transparent via-white/25 to-amber-400/60 lg:block" />
              </div>

              <AnimatePresence mode="wait">
                <CharacterCard
                  key={`right-${rightContender.id}`}
                  character={rightContender}
                  side="right"
                  selectionState={
                    selectionSide === 'idle'
                      ? 'idle'
                      : selectionSide === 'right'
                      ? 'selected'
                      : 'eliminated'
                  }
                  onSelect={handlePickCharacter}
                  onInspect={(c, e) => {
                    e.stopPropagation();
                    soundEngine.playClick();
                    setInspectedChar(c);
                  }}
                  shortcutKey="→ / 2"
                />
              </AnimatePresence>
            </div>

            {/* Bottom Keyboard Hint Strip */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-center font-mono-tech text-[11px] text-slate-400/80">
              <span>
                <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-amber-300">
                  ←
                </kbd>{' '}
                왼쪽 캐릭터 선택
              </span>
              <span>·</span>
              <span>
                <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-amber-300">
                  →
                </kbd>{' '}
                오른쪽 캐릭터 선택
              </span>
              <span>·</span>
              <span>
                <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-amber-300">
                  Z
                </kbd>{' '}
                이전 선택 되돌리기
              </span>
              <span>·</span>
              <span>
                <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-amber-300">
                  B
                </kbd>{' '}
                실시간 대진표 보기
              </span>
            </div>
          </div>
        )}

        {phase === 'winner' && winner && (
          <WinnerShowcase
            winner={winner}
            runnerUp={runnerUp}
            semifinalists={semifinalists}
            history={history}
            theme={selectedTheme}
            roundSize={selectedRoundSize}
            globalWinnerStats={globalStats?.stats?.[winner.id]}
            isSharedView={isSharedView}
            onRestartSameTheme={() =>
              startTournamentWithConfig(selectedTheme, selectedRoundSize)
            }
            onChangeTheme={(newTheme, size) =>
              startTournamentWithConfig(newTheme, size)
            }
            onOpenCodex={() => {
              refreshGlobalStats();
              setIsCodexOpen(true);
            }}
            onOpenBracket={() => setIsBracketOpen(true)}
            onInspectCharacter={(char) => setInspectedChar(char)}
          />
        )}
      </main>

      {/* Modals */}
      <CharacterDetailModal
        character={inspectedChar}
        onClose={() => setInspectedChar(null)}
        winStats={inspectedChar ? statsMap[inspectedChar.id] : undefined}
        globalStats={
          inspectedChar && globalStats?.stats
            ? globalStats.stats[inspectedChar.id]
            : undefined
        }
      />

      <CharacterCodexModal
        isOpen={isCodexOpen}
        onClose={() => setIsCodexOpen(false)}
        statsMap={statsMap}
        globalStatsMap={globalStats?.stats}
        onSelectCharacter={(char) => setInspectedChar(char)}
      />

      <BracketModal
        isOpen={isBracketOpen}
        onClose={() => setIsBracketOpen(false)}
        history={history}
        currentRoundPool={roundPool}
        currentMatchIndex={matchIndex}
        onInspectCharacter={(char) => setInspectedChar(char)}
      />
    </div>
  );
};

export default App;
