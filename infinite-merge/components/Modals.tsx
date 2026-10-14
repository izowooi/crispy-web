"use client";

/* eslint-disable @next/next/no-img-element */
import { motion } from "motion/react";
import { ChatGPTButton } from "./ChatGPTButton";

const USAGE_URL = "https://chatgpt.com/settings/usage";

function Shell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      className="absolute inset-0 z-[70] grid place-items-center bg-ink-950/60 p-5 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal
        className="glass w-full max-w-sm rounded-3xl p-6 shadow-2xl"
        initial={{ y: 24, scale: 0.96 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 12, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/** First sign-in confirmation, shown once (UI guideline: "You're using your ChatGPT plan"). */
export function WelcomeModal({ onClose }: { onClose: () => void }) {
  return (
    <Shell onClose={onClose}>
      <div className="grid size-12 place-items-center rounded-2xl bg-black ring-1 ring-white/15">
        <img src="/brand/chatgpt-logo-white.svg" alt="" className="size-6" />
      </div>
      <h2 className="mt-4 text-xl font-black tracking-tight">ChatGPT 플랜을 사용하고 있어요</h2>
      <p className="mt-1 text-xs text-white/40">You’re using your ChatGPT plan</p>
      <p className="mt-3 text-sm leading-relaxed text-white/70">
        이 앱의 연성 요청은 ChatGPT 플랜에 포함된 사용량을 사용합니다. 사용량은 ChatGPT 설정에서 관리할 수 있어요.
      </p>
      <div className="mt-5 flex gap-2">
        <button onClick={onClose} className="h-11 flex-1 rounded-xl bg-white text-sm font-bold text-black">
          확인
        </button>
        <a
          href={USAGE_URL}
          target="_blank"
          rel="noreferrer"
          className="grid h-11 place-items-center rounded-xl border border-white/15 px-4 text-sm font-medium"
        >
          Manage usage
        </a>
      </div>
    </Shell>
  );
}

/** Usage-limit state: Manage usage is the primary action per the UI guidelines. */
export function UsageLimitModal({ onClose }: { onClose: () => void }) {
  return (
    <Shell onClose={onClose}>
      <div className="grid size-12 place-items-center rounded-2xl bg-fire/15 text-2xl">⏳</div>
      <h2 className="mt-4 text-xl font-black tracking-tight">사용 한도에 도달했어요</h2>
      <p className="mt-1 text-xs text-white/40">Usage limit reached</p>
      <p className="mt-3 text-sm leading-relaxed text-white/70">
        ChatGPT 설정에서 플랜 한도나 이 앱의 사용 한도를 확인하세요. 이미 발견한 조합은 한도와 관계없이 다시 만들 수
        있어요.
      </p>
      <div className="mt-5 flex gap-2">
        <a
          href={USAGE_URL}
          target="_blank"
          rel="noreferrer"
          className="grid h-11 flex-1 place-items-center rounded-xl bg-white text-sm font-bold text-black"
        >
          Manage usage
        </a>
        <button onClick={onClose} className="h-11 rounded-xl border border-white/15 px-4 text-sm font-medium">
          닫기
        </button>
      </div>
    </Shell>
  );
}

export function PlanOffBanner({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      className="absolute inset-x-3 top-[76px] z-40 flex justify-center md:left-4 md:right-[384px]"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
    >
      <div className="glass flex w-full max-w-[520px] flex-wrap items-center gap-3 rounded-2xl !border-gold/30 p-3 pl-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">ChatGPT 플랜 사용이 허용되지 않았어요</p>
          <p className="text-xs text-white/55">로그인은 됐지만 연성하려면 플랜 사용 권한이 필요해요.</p>
        </div>
        <ChatGPTButton size="sm" />
        <button onClick={onClose} className="px-1 text-white/40 hover:text-white" aria-label="닫기">
          ✕
        </button>
      </div>
    </motion.div>
  );
}
