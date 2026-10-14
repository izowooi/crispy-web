"use client";

import { motion } from "motion/react";
import { useState } from "react";
import type { GuestInfo } from "@/lib/types";
import { ChatGPTButton, SIWC_PENDING_NOTE } from "./ChatGPTButton";
import { TurnstileWidget } from "./Turnstile";

const SOURCE_URL = "https://github.com/izowooi/crispy-web/tree/main/infinite-merge";

// Clockwise order is the 상생 cycle: 火生土 → 土生金 → 金生水 → 水生木 → 木生火.
const WHEEL = [
  { hanja: "火", name: "불", color: "var(--fire)" },
  { hanja: "土", name: "흙", color: "var(--earth)" },
  { hanja: "金", name: "금속", color: "var(--metal)" },
  { hanja: "水", name: "물", color: "var(--water)" },
  { hanja: "木", name: "나무", color: "var(--wood)" },
];

const C = 150;
const R = 108;
const points = WHEEL.map((_, i) => {
  const a = ((-90 + i * 72) * Math.PI) / 180;
  return { x: C + R * Math.cos(a), y: C + R * Math.sin(a) };
});
// 상극 star: each element overcomes the one two steps ahead.
const star = [0, 2, 4, 1, 3, 0].map((i) => `${points[i].x},${points[i].y}`).join(" ");

const TITLE = "인피니티 머지";

type Props = {
  worldCount: number;
  guest: GuestInfo;
  /** False on the hosted site: plan usage is approved for local runs only. */
  siwc: boolean;
  /** Resolves true when the guest session started; a Turnstile token is single-use either way. */
  onGuestStart: (turnstileToken: string | null) => Promise<boolean>;
};

export function Landing({ worldCount, guest, siwc, onGuestStart }: Props) {
  const [starting, setStarting] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [widgetKey, setWidgetKey] = useState(0);
  const needsToken = Boolean(guest.turnstileSiteKey) && guest.available;
  return (
    <motion.section
      className="absolute inset-0 z-[65] overflow-y-auto bg-[radial-gradient(ellipse_at_center,rgb(7_8_12/0.55),rgb(7_8_12/0.92)_70%)] backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04, filter: "blur(10px)", transition: { duration: 0.5 } }}
    >
      <div className="mx-auto flex min-h-full max-w-xl flex-col items-center justify-center px-6 py-14 text-center">
        <motion.div
          className="relative size-[260px] md:size-[300px]"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 120, damping: 16 }}
        >
          <svg viewBox="0 0 300 300" className="absolute inset-0 size-full overflow-visible">
            <defs>
              <linearGradient id="cycle" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--fire)" />
                <stop offset="25%" stopColor="var(--earth)" />
                <stop offset="50%" stopColor="var(--metal)" />
                <stop offset="75%" stopColor="var(--water)" />
                <stop offset="100%" stopColor="var(--wood)" />
              </linearGradient>
            </defs>
            <polygon points={star} fill="none" stroke="rgb(255 255 255 / 0.07)" strokeWidth="1" />
            <circle cx={C} cy={C} r={R} fill="none" stroke="rgb(255 255 255 / 0.06)" strokeWidth="1" />
            <motion.circle
              cx={C}
              cy={C}
              r={R}
              fill="none"
              stroke="url(#cycle)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="60 620"
              animate={{ strokeDashoffset: [0, -680] }}
              transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
              style={{ filter: "drop-shadow(0 0 6px rgb(255 255 255 / 0.4))" }}
            />
          </svg>
          {WHEEL.map((w, i) => (
            <motion.div
              key={w.hanja}
              className="absolute grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full md:size-[70px]"
              style={{
                left: `${(points[i].x / 300) * 100}%`,
                top: `${(points[i].y / 300) * 100}%`,
                background: `radial-gradient(circle, color-mix(in srgb, ${w.color} 22%, transparent), transparent 70%)`,
              }}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1, y: [0, -4, 0] }}
              transition={{
                opacity: { delay: 0.15 + i * 0.09 },
                scale: { delay: 0.15 + i * 0.09, type: "spring", stiffness: 260, damping: 14 },
                y: { repeat: Infinity, duration: 3.2, delay: i * 0.4, ease: "easeInOut" },
              }}
            >
              <span
                className="font-serif text-4xl font-black md:text-[2.6rem]"
                style={{ color: w.color, textShadow: `0 0 24px ${w.color}` }}
              >
                {w.hanja}
              </span>
            </motion.div>
          ))}
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-serif text-5xl font-black text-white/80"
            animate={{ opacity: [0.35, 0.9, 0.35] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          >
            ∞
          </motion.div>
        </motion.div>

        <h1 className="mt-8 font-serif text-[2.6rem] font-black leading-none tracking-tight md:text-6xl">
          {[...TITLE].map((ch, i) => (
            <motion.span
              key={i}
              className="inline-block"
              initial={{ y: 40, opacity: 0, rotateX: -80, filter: "blur(10px)" }}
              animate={{ y: 0, opacity: 1, rotateX: 0, filter: "blur(0px)" }}
              transition={{ delay: 0.5 + i * 0.05, type: "spring", stiffness: 220, damping: 18 }}
            >
              {ch === " " ? " " : ch}
            </motion.span>
          ))}
        </h1>

        <motion.p
          className="mt-4 max-w-md text-[0.95rem] leading-relaxed text-white/65"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.95 }}
        >
          나무·불·흙·금속·물. 다섯 기운을 겹치면 AI가 새로운 원소를 연성합니다.
          <br className="hidden sm:block" /> 증기에서 화산으로, 화산에서 신화로 — 끝은 없어요.
        </motion.p>

        <motion.div
          className="mt-8 flex w-full max-w-xs flex-col items-stretch gap-3"
          initial={{ opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 1.1, type: "spring", stiffness: 260, damping: 20 }}
        >
          <ChatGPTButton pending={!siwc} />
          {!siwc && (
            <p id="siwc-pending-note" className="-mt-1 text-[0.72rem] leading-relaxed text-white/45">
              {SIWC_PENDING_NOTE}
            </p>
          )}
          <div className="flex items-center gap-3 text-[0.7rem] text-white/30">
            <span className="h-px flex-1 bg-white/10" />
            또는
            <span className="h-px flex-1 bg-white/10" />
          </div>
          {needsToken && guest.turnstileSiteKey && (
            <TurnstileWidget key={widgetKey} siteKey={guest.turnstileSiteKey} onToken={setToken} />
          )}
          <button
            disabled={!guest.available || starting || (needsToken && !token)}
            onClick={async () => {
              setStarting(true);
              try {
                const ok = await onGuestStart(token);
                if (!ok && needsToken) {
                  setToken(null);
                  setWidgetKey((k) => k + 1);
                }
              } finally {
                setStarting(false);
              }
            }}
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-6 text-[0.95rem] font-semibold text-white/90 transition hover:border-white/35 hover:bg-white/[0.08] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="text-earth transition group-hover:rotate-90">✦</span>
            {starting ? "입장하는 중…" : needsToken && !token ? "자동 입력 방지 확인 중…" : "로그인 없이 바로 시작"}
          </button>
          <p className="text-[0.72rem] leading-relaxed text-white/40">
            {guest.available
              ? `Claude Haiku 게스트 · 하루 ${guest.dailyLimit}회 · 운영자 크레딧으로 제공돼 예고 없이 종료될 수 있어요`
              : siwc
                ? "게스트 모드는 지금 쉬는 중이에요. ChatGPT로 계속해 주세요."
                : "오늘의 체험 연성이 모두 소진됐어요. 한국 시간 자정에 다시 열려요."}
          </p>
        </motion.div>

        <motion.ul
          className="mt-8 grid w-full max-w-md gap-2 text-left text-[0.8rem] text-white/55"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
        >
          {siwc ? (
            <>
              <Note icon="⚡">ChatGPT로 계속하면 내 ChatGPT Plus·Pro 플랜 사용량으로 연성해요. API 키가 필요 없어요.</Note>
              <Note icon="🔒">앱이 받는 정보는 이름·이메일·프로필 사진뿐이에요. 대화 내용은 공유되지 않아요.</Note>
              <Note icon="🎟️">게스트로 시작해도 나중에 ChatGPT로 로그인하면 발견한 원소를 그대로 가져가요.</Note>
            </>
          ) : (
            <>
              <Note icon="🌍">모든 플레이어가 하나의 레시피 책을 공유해요. 누군가 이미 발견한 조합은 바로 나와요.</Note>
              <Note icon="🎟️">로그인 없이 하루 {guest.dailyLimit}회 새 조합을 연성할 수 있어요. 이미 발견된 조합은 횟수에 들어가지 않아요.</Note>
              <Note icon="🖥️">
                내 ChatGPT 플랜으로 마음껏 하려면{" "}
                <a href={SOURCE_URL} target="_blank" rel="noreferrer" className="font-semibold text-water hover:underline">
                  오픈소스
                </a>
                를 내려받아 내 PC에서 실행하세요.
              </Note>
            </>
          )}
        </motion.ul>

        {worldCount > 5 && (
          <p className="mt-6 text-xs text-white/35">이 세계에서 지금까지 {worldCount}개의 원소가 발견되었어요</p>
        )}
      </div>
    </motion.section>
  );
}

function Note({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5 rounded-xl border border-white/6 bg-white/[0.025] px-3 py-2">
      <span>{icon}</span>
      <span>{children}</span>
    </li>
  );
}
