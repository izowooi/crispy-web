import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Crown,
  Sparkles,
  MapPin,
  Shield,
  MessageSquareQuote,
  BookOpen,
  Lock,
  RotateCcw,
  Share2,
  Trophy,
  Swords,
  Library,
  Check,
  Download,
  Volume2,
  Link2,
  Globe,
  Sword,
} from 'lucide-react';
import { Character, WorldTheme, THEME_METADATA } from '../data/characters';
import { MatchRecord } from './BracketModal';
import { soundEngine } from '../utils/soundEngine';
import {
  createSharedResult,
  exportWinnerPhotoCard,
  CharacterWinRecord,
} from '../utils/api';

interface WinnerShowcaseProps {
  winner: Character;
  runnerUp: Character | null;
  semifinalists: Character[];
  history: MatchRecord[];
  theme: WorldTheme;
  roundSize?: number;
  globalWinnerStats?: CharacterWinRecord;
  isSharedView?: boolean;
  onRestartSameTheme: () => void;
  onChangeTheme: (newTheme: WorldTheme, size: number) => void;
  onOpenCodex: () => void;
  onOpenBracket: () => void;
  onInspectCharacter: (character: Character) => void;
}

export const WinnerShowcase: React.FC<WinnerShowcaseProps> = ({
  winner,
  runnerUp,
  semifinalists,
  history,
  theme,
  roundSize = 16,
  globalWinnerStats,
  isSharedView = false,
  onRestartSameTheme,
  onChangeTheme,
  onOpenCodex,
  onOpenBracket,
  onInspectCharacter,
}) => {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharingLink, setSharingLink] = useState(false);
  const [downloadingCard, setDownloadingCard] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    soundEngine.playChampionFanfare();

    // Launch dual-cannon celebratory confetti
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.65 },
        colors: [winner.accentColor, '#fbbf24', '#ffffff'],
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.65 },
        colors: [winner.accentColor, '#f43f5e', '#ffffff'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, [winner]);

  // Compute the winner's defeated opponents path
  const winnerMatches = history.filter((m) => m.winner.id === winner.id);

  const handleShareText = () => {
    soundEngine.playClick();
    const text = [
      `🏆 [MUSE CUP : 이상형 월드컵 최종 우승]`,
      `👑 나의 최종 이상형: ${winner.name} (${winner.title})`,
      `📍 소속/배경: ${winner.faction} · ${winner.location}`,
      `💬 "${winner.quote}"`,
      runnerUp ? `🥈 준우승: ${runnerUp.name} (${runnerUp.title})` : '',
      shareUrl ? `🔗 결과 링크: ${shareUrl}` : `🔗 플레이: ${window.location.origin}`,
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCreatePermanentShareLink = async () => {
    soundEngine.playClick();
    if (shareUrl) {
      navigator.clipboard?.writeText(shareUrl).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      return;
    }

    setSharingLink(true);
    const result = await createSharedResult({
      winnerId: winner.id,
      runnerUpId: runnerUp?.id,
      semifinalistIds: semifinalists.map((s) => s.id),
      theme,
      roundSize,
      history: history.map((m) => ({
        roundSize: m.roundSize,
        matchNumber: m.matchIndex + 1,
        leftId: m.left.id,
        rightId: m.right.id,
        winnerId: m.winner.id,
      })),
    });
    setSharingLink(false);

    if (result.ok && result.url) {
      setShareUrl(result.url);
      navigator.clipboard?.writeText(result.url).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2800);
    } else {
      handleShareText();
    }
  };

  const handleDownloadPhotoCard = async () => {
    soundEngine.playClick();
    setDownloadingCard(true);
    const themeMeta = THEME_METADATA[theme];
    await exportWinnerPhotoCard(
      winner,
      themeMeta?.name || 'MUSE CUP WORLD TOURNAMENT',
      roundSize
    );
    setDownloadingCard(false);
  };

  const statItems = [
    { label: '매력도 (CHARM)', value: winner.stats.charm },
    { label: '애정도 (AFFECTION)', value: winner.stats.affection },
    { label: '지성/책략 (INTELLECT)', value: winner.stats.intellect },
    { label: '기품/아우라 (AURA)', value: winner.stats.aura },
    { label: '신비도 (MYSTERY)', value: winner.stats.mystery },
  ];

  const globalWinRate =
    globalWinnerStats && globalWinnerStats.matches > 0
      ? Math.round((globalWinnerStats.wins / globalWinnerStats.matches) * 100)
      : null;

  return (
    <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      {/* Top Kinetic Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col items-center text-center"
      >
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-1.5 text-xs font-bold tracking-[0.25em] text-amber-300 uppercase backdrop-blur-md">
          <Crown className="h-4 w-4 text-amber-400" />
          <span>
            {isSharedView
              ? 'SHARED TOURNAMENT CHAMPION SNAPSHOT'
              : 'ULTIMATE IDEAL TYPE CROWNED'}
          </span>
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
        </div>

        <h1 className="font-display bg-gradient-to-r from-amber-200 via-white to-amber-400 bg-clip-text text-4xl font-black tracking-[0.1em] text-transparent sm:text-6xl">
          GRAND CHAMPION
        </h1>
        <p className="mt-2 font-serif-kr text-base text-slate-300 sm:text-lg">
          수많은 운명의 갈림길 끝에 당신의 심장이 선택한 단 한 사람
        </p>
      </motion.div>

      {/* Main Champion Card Spread */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 200, delay: 0.1 }}
        className="relative grid grid-cols-1 overflow-hidden rounded-3xl border border-white/20 bg-[#0c0c16]/95 shadow-2xl lg:grid-cols-12"
        style={{
          boxShadow: `0 30px 100px -15px ${winner.glowColor}, 0 0 0 1px ${winner.accentColor}55`,
        }}
      >
        {/* Left 5 Cols: Full Champion Portrait */}
        <div
          onClick={() => onInspectCharacter(winner)}
          className="group relative min-h-[460px] cursor-pointer overflow-hidden lg:col-span-5"
        >
          <img
            src={winner.image}
            alt={winner.name}
            className="h-full w-full object-cover object-top transition duration-700 group-hover:scale-105"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0c0c16] via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-[#0c0c16]" />

          {/* Champion Ribbon Badge */}
          <div className="absolute top-4 left-4 flex items-center gap-2 rounded-full border border-amber-300/60 bg-black/80 px-4 py-1.5 text-xs font-bold text-amber-300 shadow-lg backdrop-blur-md">
            <Trophy className="h-4 w-4 text-amber-400" />
            <span>1ST PLACE · 최종 우승</span>
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2">
            <span
              className="rounded-full px-3.5 py-1 font-mono-tech text-xs font-bold text-slate-950 shadow-lg"
              style={{ backgroundColor: winner.accentColor }}
            >
              {winner.badgeText}
            </span>
            <span className="rounded-full border border-white/20 bg-black/75 px-3 py-1 font-mono-tech text-xs font-semibold text-white backdrop-blur-md">
              {winner.mbti} · {winner.age}
            </span>
          </div>
        </div>

        {/* Right 7 Cols: True Ending Story & Details */}
        <div className="flex flex-col justify-between gap-5 p-6 sm:p-8 lg:col-span-7">
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div
                  className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase"
                  style={{ color: winner.accentColor }}
                >
                  <Sparkles className="h-4 w-4" />
                  <span>{winner.title}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-baseline gap-3">
                  <h2 className="font-serif-kr text-3xl font-black text-white sm:text-5xl">
                    {winner.name}
                  </h2>
                  <span className="font-display text-sm tracking-widest text-white/45 uppercase">
                    {winner.englishName}
                  </span>
                </div>
              </div>

              {globalWinnerStats && (
                <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-950/25 px-3.5 py-2 text-xs">
                  <Globe className="h-4 w-4 text-emerald-400" />
                  <div>
                    <div className="font-mono-tech text-[10px] font-bold text-emerald-300">
                      GLOBAL D1 RECORD
                    </div>
                    <div className="font-mono-tech text-white">
                      누적 우승 <strong>{globalWinnerStats.championships}회</strong> · 승률{' '}
                      <strong>{globalWinRate ?? 0}%</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Faction & Setting */}
            <div className="grid grid-cols-1 gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs sm:grid-cols-2">
              <div className="flex items-center gap-2.5">
                <Shield className="h-4 w-4 shrink-0" style={{ color: winner.accentColor }} />
                <div>
                  <div className="text-[10px] text-white/40 uppercase">소속 및 직위</div>
                  <div className="font-semibold text-white">
                    {winner.faction} · {winner.role}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 shrink-0" style={{ color: winner.accentColor }} />
                <div>
                  <div className="text-[10px] text-white/40 uppercase">주 배경 무대</div>
                  <div className="font-semibold text-white">{winner.location}</div>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5">
              {winner.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-lg border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Confession Quote + TTS Button */}
            <div
              className="rounded-2xl border bg-white/[0.04] p-4 shadow-inner"
              style={{ borderColor: `${winner.accentColor}66` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <MessageSquareQuote
                    className="mt-0.5 h-5 w-5 shrink-0"
                    style={{ color: winner.accentColor }}
                  />
                  <p className="font-serif-kr text-sm leading-relaxed font-semibold text-amber-100 italic sm:text-base">
                    {winner.quote}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const started = soundEngine.speakQuote(winner, () =>
                      setIsSpeaking(false)
                    );
                    setIsSpeaking(started);
                  }}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                    isSpeaking
                      ? 'border-amber-400 bg-amber-400/20 text-amber-300'
                      : 'border-white/15 bg-white/10 text-white hover:border-amber-400/60'
                  }`}
                >
                  <Volume2 className={`h-3.5 w-3.5 ${isSpeaking ? 'animate-pulse text-amber-300' : ''}`} />
                  <span>{isSpeaking ? '보이스 정지' : '고백 보이스 듣기'}</span>
                </button>
              </div>
            </div>

            {/* Full Lore & Unlocked Secret */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-300">
                  <BookOpen className="h-3.5 w-3.5" style={{ color: winner.accentColor }} />
                  <span>캐릭터 배경 서사</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-300/90">
                  {winner.backstory}
                </p>
              </div>

              <div className="rounded-2xl border border-amber-400/30 bg-amber-500/[0.07] p-4">
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <Lock className="h-3.5 w-3.5" />
                  <span>우승 특전 : 시크릿 비하인드 해금</span>
                </div>
                <p className="text-xs leading-relaxed text-amber-100/90">
                  {winner.secretNote}
                </p>
              </div>
            </div>

            {/* Stat Bars */}
            <div className="grid grid-cols-2 gap-3 pt-1 sm:grid-cols-5">
              {statItems.map((st) => (
                <div
                  key={st.label}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-2.5 text-center"
                >
                  <div className="text-[10px] text-slate-400">{st.label.split(' ')[0]}</div>
                  <div
                    className="mt-0.5 font-mono-tech text-lg font-black"
                    style={{ color: winner.accentColor }}
                  >
                    {st.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Winner Match Path */}
          {winnerMatches.length > 0 && (
            <div className="border-t border-white/10 pt-4">
              <div className="mb-2.5 text-xs font-bold tracking-wider text-slate-400 uppercase">
                우승까지의 운명 매치 기록 ({winnerMatches.length}연승)
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {winnerMatches.map((m) => {
                  const defeated = m.left.id === winner.id ? m.right : m.left;
                  const roundName =
                    m.roundSize === 2
                      ? '결승'
                      : m.roundSize === 4
                      ? '4강'
                      : `${m.roundSize}강`;
                  return (
                    <div
                      key={`${m.roundSize}-${m.matchIndex}`}
                      onClick={() => onInspectCharacter(defeated)}
                      className="flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pr-3 pl-1.5 text-xs transition hover:border-white/30"
                    >
                      <img
                        src={defeated.image}
                        alt={defeated.name}
                        className="h-6 w-6 rounded-full object-cover object-top"
                      />
                      <span className="font-mono-tech text-[10px] font-bold text-amber-300">
                        {roundName}
                      </span>
                      <span className="text-slate-300">vs {defeated.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Runner-Up & Semifinalists Podium */}
      {(runnerUp || semifinalists.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-8 rounded-3xl border border-white/10 bg-[#0d0d17]/90 p-6"
        >
          <h3 className="mb-4 font-serif-kr text-lg font-bold text-white">
            마지막까지 경합한 상위 라운드 진출자 (클릭하여 상세 보기)
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {runnerUp && (
              <div
                onClick={() => onInspectCharacter(runnerUp)}
                className="flex cursor-pointer items-center gap-3.5 rounded-2xl border border-slate-300/30 bg-white/[0.04] p-3.5 transition hover:border-white/50"
              >
                <img
                  src={runnerUp.image}
                  alt={runnerUp.name}
                  className="h-16 w-16 shrink-0 rounded-2xl object-cover object-top"
                />
                <div className="truncate">
                  <span className="inline-block rounded bg-slate-200 px-2 py-0.5 font-mono-tech text-[10px] font-bold text-slate-900">
                    2ND · 준우승
                  </span>
                  <div className="mt-1 truncate font-serif-kr text-base font-bold text-white">
                    {runnerUp.name}
                  </div>
                  <div className="truncate text-xs text-slate-400">{runnerUp.title}</div>
                </div>
              </div>
            )}

            {semifinalists.map((sf) => (
              <div
                key={sf.id}
                onClick={() => onInspectCharacter(sf)}
                className="flex cursor-pointer items-center gap-3.5 rounded-2xl border border-amber-700/30 bg-white/[0.02] p-3.5 transition hover:border-white/40"
              >
                <img
                  src={sf.image}
                  alt={sf.name}
                  className="h-16 w-16 shrink-0 rounded-2xl object-cover object-top"
                />
                <div className="truncate">
                  <span className="inline-block rounded bg-amber-500/20 px-2 py-0.5 font-mono-tech text-[10px] font-bold text-amber-300">
                    TOP 4 · 4강 진출
                  </span>
                  <div className="mt-1 truncate font-serif-kr text-base font-bold text-white">
                    {sf.name}
                  </div>
                  <div className="truncate text-xs text-slate-400">{sf.title}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Primary Collect & Share Action Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-8 flex flex-wrap items-center justify-center gap-3"
      >
        <button
          type="button"
          onClick={handleDownloadPhotoCard}
          disabled={downloadingCard}
          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-rose-400 px-6 py-3.5 text-sm font-black text-slate-950 shadow-xl shadow-amber-500/25 transition hover:scale-105 disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          <span>{downloadingCard ? '포토카드 렌더링 중...' : '우승 타로 포토카드 (.PNG) 저장'}</span>
        </button>

        <button
          type="button"
          onClick={handleCreatePermanentShareLink}
          disabled={sharingLink}
          className="flex items-center gap-2 rounded-full border border-emerald-400/50 bg-emerald-500/15 px-6 py-3.5 text-sm font-bold text-emerald-200 transition hover:scale-105 hover:bg-emerald-500/25"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-emerald-400" />
              <span className="text-emerald-300">
                {shareUrl ? '영구 공유 링크 복사 완료!' : '결과 복사 완료!'}
              </span>
            </>
          ) : (
            <>
              <Link2 className="h-4 w-4 text-emerald-300" />
              <span>
                {sharingLink
                  ? 'D1 공유 링크 생성 중...'
                  : shareUrl
                  ? '영구 공유 링크 다시 복사'
                  : '우승 결과 영구 링크 공유'}
              </span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleShareText}
          className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-white/15"
        >
          <Share2 className="h-4 w-4 text-slate-300" />
          <span>텍스트 요약 복사</span>
        </button>
      </motion.div>

      {/* Secondary Navigation & Theme Challenge Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.38 }}
        className="mt-4 flex flex-wrap items-center justify-center gap-2.5"
      >
        <button
          type="button"
          onClick={onRestartSameTheme}
          className="flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/15 px-5 py-2.5 text-xs font-bold text-amber-200 transition hover:bg-amber-400/25"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>현재 테마 다시 플레이</span>
        </button>

        {theme !== 'male_fantasy' && (
          <button
            type="button"
            onClick={() => onChangeTheme('male_fantasy', 16)}
            className="flex items-center gap-2 rounded-full border border-indigo-400/50 bg-indigo-500/15 px-5 py-2.5 text-xs font-bold text-indigo-200 transition hover:bg-indigo-500/25"
          >
            <Sword className="h-3.5 w-3.5 text-indigo-300" />
            <span>여성향 로판 남주 16강 도전</span>
          </button>
        )}

        {theme !== 'male_modern' && (
          <button
            type="button"
            onClick={() => onChangeTheme('male_modern', 16)}
            className="flex items-center gap-2 rounded-full border border-purple-400/50 bg-purple-500/15 px-5 py-2.5 text-xs font-bold text-purple-200 transition hover:bg-purple-500/25"
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-300" />
            <span>여성향 서울 남주 16강 도전</span>
          </button>
        )}

        {theme !== 'fantasy' && (
          <button
            type="button"
            onClick={() => onChangeTheme('fantasy', 16)}
            className="flex items-center gap-2 rounded-full border border-amber-400/50 bg-amber-500/15 px-5 py-2.5 text-xs font-bold text-amber-200 transition hover:bg-amber-500/25"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>히로인 로판 16강 도전</span>
          </button>
        )}

        {theme !== 'grand_all' && (
          <button
            type="button"
            onClick={() => onChangeTheme('grand_all', 64)}
            className="flex items-center gap-2 rounded-full border border-rose-400/50 bg-rose-500/15 px-5 py-2.5 text-xs font-bold text-rose-200 transition hover:bg-rose-500/25"
          >
            <Crown className="h-3.5 w-3.5 text-rose-300" />
            <span>64강 전 차원 통합 올스타전</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenBracket}
          className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/15"
        >
          <Swords className="h-3.5 w-3.5 text-amber-400" />
          <span>전체 대진표 기록</span>
        </button>

        <button
          type="button"
          onClick={onOpenCodex}
          className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/15"
        >
          <Library className="h-3.5 w-3.5 text-amber-400" />
          <span>64인 도감 & 글로벌 랭킹</span>
        </button>
      </motion.div>
    </div>
  );
};
