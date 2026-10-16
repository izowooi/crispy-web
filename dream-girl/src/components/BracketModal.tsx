import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Swords, CheckCircle2, Clock } from 'lucide-react';
import { Character } from '../data/characters';
import { getRoundLabels } from './KineticRoundIntro';

export interface MatchRecord {
  roundSize: number;
  matchIndex: number;
  left: Character;
  right: Character;
  winner: Character;
}

interface BracketModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: MatchRecord[];
  currentRoundPool: Character[];
  currentMatchIndex: number;
  onInspectCharacter: (character: Character) => void;
}

export const BracketModal: React.FC<BracketModalProps> = ({
  isOpen,
  onClose,
  history,
  currentRoundPool,
  currentMatchIndex,
  onInspectCharacter,
}) => {
  if (!isOpen) return null;

  const currentRoundSize = currentRoundPool.length;
  const upcomingPairs: Array<{ left: Character; right: Character; index: number }> = [];
  for (let i = currentMatchIndex * 2; i < currentRoundPool.length; i += 2) {
    if (currentRoundPool[i] && currentRoundPool[i + 1]) {
      upcomingPairs.push({
        left: currentRoundPool[i],
        right: currentRoundPool[i + 1],
        index: i / 2 + 1,
      });
    }
  }

  // Group history by roundSize
  const rounds = Array.from(new Set(history.map((h) => h.roundSize))).sort((a, b) => b - a);

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
          className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#0a0a12] shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-6 py-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-amber-400 uppercase">
                <Swords className="h-3.5 w-3.5" />
                <span>LIVE TOURNAMENT BRACKET & LOG</span>
              </div>
              <h2 className="mt-0.5 font-serif-kr text-2xl font-black text-white">
                실시간 토너먼트 대진표 & 선택 기록
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/75 transition hover:border-white/40 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            {/* Current & Upcoming Matches in Active Round */}
            {upcomingPairs.length > 0 && (
              <div>
                <div className="mb-3 flex items-center gap-2 text-xs font-bold tracking-wider text-sky-400 uppercase">
                  <Clock className="h-4 w-4" />
                  <span>
                    현재 진행 및 대기 중인 매치 ({getRoundLabels(currentRoundSize).kr})
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {upcomingPairs.map((pair, idx) => {
                    const isCurrent = idx === 0;
                    return (
                      <div
                        key={`${pair.left.id}-${pair.right.id}`}
                        className={`flex items-center justify-between rounded-2xl border p-3 ${
                          isCurrent
                            ? 'border-amber-400/50 bg-amber-500/[0.07]'
                            : 'border-white/10 bg-white/[0.02]'
                        }`}
                      >
                        <div
                          onClick={() => onInspectCharacter(pair.left)}
                          className="flex flex-1 cursor-pointer items-center gap-2.5 truncate pr-2 hover:opacity-80"
                        >
                          <img
                            src={pair.left.image}
                            alt={pair.left.name}
                            className="h-11 w-11 shrink-0 rounded-xl object-cover object-top"
                          />
                          <div className="truncate">
                            <div className="truncate text-xs font-bold text-white">
                              {pair.left.name}
                            </div>
                            <div className="truncate text-[10px] text-slate-400">
                              {pair.left.title}
                            </div>
                          </div>
                        </div>

                        <div className="px-2 text-center font-mono-tech text-[10px] font-bold text-amber-400">
                          {isCurrent ? 'LIVE VS' : `MATCH #${pair.index}`}
                        </div>

                        <div
                          onClick={() => onInspectCharacter(pair.right)}
                          className="flex flex-1 cursor-pointer items-center justify-end gap-2.5 truncate pl-2 text-right hover:opacity-80"
                        >
                          <div className="truncate">
                            <div className="truncate text-xs font-bold text-white">
                              {pair.right.name}
                            </div>
                            <div className="truncate text-[10px] text-slate-400">
                              {pair.right.title}
                            </div>
                          </div>
                          <img
                            src={pair.right.image}
                            alt={pair.right.name}
                            className="h-11 w-11 shrink-0 rounded-xl object-cover object-top"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Completed Matches by Round */}
            {rounds.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm text-slate-400">
                아직 완료된 매치가 없습니다. 첫 번째 이상형을 선택해 보세요!
              </div>
            ) : (
              rounds.map((rSize) => {
                const rMatches = history.filter((h) => h.roundSize === rSize);
                const label = getRoundLabels(rSize);
                return (
                  <div key={rSize}>
                    <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="font-serif-kr text-base font-bold text-white">
                        {label.kr}{' '}
                        <span className="font-mono-tech text-xs font-normal text-amber-400">
                          ({label.en})
                        </span>
                      </span>
                      <span className="font-mono-tech text-xs text-slate-400">
                        완료 {rMatches.length}경기
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {rMatches.map((m) => {
                        const leftWon = m.winner.id === m.left.id;
                        return (
                          <div
                            key={`${m.roundSize}-${m.matchIndex}`}
                            className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#12121e] p-3"
                          >
                            {/* Left */}
                            <div
                              onClick={() => onInspectCharacter(m.left)}
                              className={`flex flex-1 cursor-pointer items-center gap-2.5 truncate pr-2 ${
                                leftWon ? 'opacity-100' : 'opacity-40 grayscale'
                              }`}
                            >
                              <div className="relative shrink-0">
                                <img
                                  src={m.left.image}
                                  alt={m.left.name}
                                  className="h-11 w-11 rounded-xl object-cover object-top"
                                />
                                {leftWon && (
                                  <CheckCircle2 className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-black text-amber-400" />
                                )}
                              </div>
                              <div className="truncate">
                                <div className="truncate text-xs font-bold text-white">
                                  {m.left.name}
                                </div>
                                <div className="truncate text-[10px] text-slate-400">
                                  {m.left.title}
                                </div>
                              </div>
                            </div>

                            <div className="px-2 font-mono-tech text-[10px] font-bold text-white/30">
                              VS
                            </div>

                            {/* Right */}
                            <div
                              onClick={() => onInspectCharacter(m.right)}
                              className={`flex flex-1 cursor-pointer items-center justify-end gap-2.5 truncate pl-2 text-right ${
                                !leftWon ? 'opacity-100' : 'opacity-40 grayscale'
                              }`}
                            >
                              <div className="truncate">
                                <div className="truncate text-xs font-bold text-white">
                                  {m.right.name}
                                </div>
                                <div className="truncate text-[10px] text-slate-400">
                                  {m.right.title}
                                </div>
                              </div>
                              <div className="relative shrink-0">
                                <img
                                  src={m.right.image}
                                  alt={m.right.name}
                                  className="h-11 w-11 rounded-xl object-cover object-top"
                                />
                                {!leftWon && (
                                  <CheckCircle2 className="absolute -top-1 -left-1 h-4 w-4 rounded-full bg-black text-amber-400" />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
