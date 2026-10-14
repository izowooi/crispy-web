"use client";

/* eslint-disable @next/next/no-img-element */
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { ModelsResponse, PlanView, UserView } from "@/lib/types";
import { ChatGPTButton } from "./ChatGPTButton";

const USAGE_URL = "https://chatgpt.com/settings/usage";

type Props = {
  user: UserView | null;
  plan: PlanView | null;
  ownedCount: number;
  firstCount: number;
  worldCount: number;
  boardCount: number;
  onLogout: () => void;
  onReset: () => void;
  onClearBoard: () => void;
  onModelChange: (slug: string) => void;
  /** Hosted runs have no Sign in with ChatGPT, so its upsell is hidden. */
  siwc: boolean;
};

export function TopBar(props: Props) {
  const { user, plan, ownedCount, firstCount, worldCount, boardCount, onClearBoard } = props;
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-center gap-3 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:px-4">
      <div className="glass pointer-events-auto flex h-12 items-center gap-3 rounded-2xl px-3 min-[420px]:pr-4">
        <Logo />
        <div className="hidden leading-tight min-[420px]:block">
          <p className="whitespace-nowrap text-[0.95rem] font-black tracking-tight">인피니티 머지</p>
          <p className="hidden text-[0.65rem] font-medium tracking-[0.2em] text-white/40 sm:block">五行 ALCHEMY</p>
        </div>
      </div>

      {user && (
        <div className="glass pointer-events-auto hidden h-12 items-center gap-4 rounded-2xl px-4 text-sm lg:flex">
          <Stat label="보유" value={ownedCount} />
          <Stat label="최초 발견" value={firstCount} accent />
          <Stat label="세계" value={worldCount} />
        </div>
      )}

      <div className="flex-1" />

      {user && boardCount > 0 && (
        <button
          onClick={onClearBoard}
          className="glass pointer-events-auto hidden h-12 rounded-2xl px-4 text-sm font-medium text-white/70 transition hover:text-white md:block"
        >
          보드 정리
        </button>
      )}

      {plan && <PlanChip plan={plan} />}
      {user && <AccountMenu {...props} user={user} />}
    </header>
  );
}

function Logo() {
  const dots = [
    { c: "var(--wood)", x: 12, y: 3 },
    { c: "var(--fire)", x: 20.6, y: 9.2 },
    { c: "var(--earth)", x: 17.3, y: 19.3 },
    { c: "var(--metal)", x: 6.7, y: 19.3 },
    { c: "var(--water)", x: 3.4, y: 9.2 },
  ];
  return (
    <motion.svg
      viewBox="0 0 24 24"
      className="size-7"
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
    >
      <polygon
        points={dots.map((d) => `${d.x},${d.y}`).join(" ")}
        fill="none"
        stroke="rgb(255 255 255 / 0.18)"
        strokeWidth="1"
      />
      {dots.map((d) => (
        <circle key={d.c} cx={d.x} cy={d.y} r="2.6" fill={d.c} />
      ))}
    </motion.svg>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-xs text-white/45">{label}</span>
      <motion.span
        key={value}
        initial={{ y: -6, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`font-bold tabular-nums ${accent ? "text-gold" : ""}`}
      >
        {value}
      </motion.span>
    </div>
  );
}

/** The "Using ChatGPT plan" indicator + Manage usage link required by the UI guidelines. */
function PlanChip({ plan }: { plan: PlanView }) {
  if (plan.provider === "claude") return <GuestChip plan={plan} />;
  const mock = plan.provider === "mock";
  const ok = mock || plan.sharing;
  return (
    <div className="glass pointer-events-auto flex h-12 items-center gap-2 rounded-2xl px-3 sm:gap-3 sm:px-4">
      <span className="relative flex size-2">
        <span className={`absolute inset-0 animate-ping rounded-full opacity-60 ${ok ? (mock ? "bg-earth" : "bg-wood") : "bg-fire"}`} />
        <span className={`relative size-2 rounded-full ${ok ? (mock ? "bg-earth" : "bg-wood") : "bg-fire"}`} />
      </span>
      <div className="leading-tight">
        <p className="hidden text-xs font-bold sm:block">
          {mock ? "Mock AI · 오프라인 테스트" : plan.sharing ? "Using ChatGPT plan" : "ChatGPT 플랜 미허용"}
        </p>
        <p className="whitespace-nowrap text-[0.7rem] font-bold sm:hidden">{mock ? "Mock AI" : plan.sharing ? "ChatGPT 플랜" : "플랜 미허용"}</p>
        {!mock && <p className="hidden text-[0.68rem] text-white/45 sm:block">{plan.model ?? "모델 자동 선택"}</p>}
      </div>
      {!mock && (
        <a
          href={USAGE_URL}
          target="_blank"
          rel="noreferrer"
          className="whitespace-nowrap rounded-lg border border-white/12 px-2 py-1 text-[0.7rem] font-medium text-white/75 transition hover:border-white/30 hover:text-white"
        >
          Manage usage
        </a>
      )}
    </div>
  );
}

/** Guest mode runs on the operator's credits, so the chip shows today's remaining calls instead of Manage usage. */
function GuestChip({ plan }: { plan: PlanView }) {
  const left = plan.remaining ?? 0;
  return (
    <div className="glass pointer-events-auto flex h-12 items-center gap-2 rounded-2xl px-3 sm:gap-3 sm:px-4">
      <span className={`size-2 rounded-full ${left > 0 ? "bg-water shadow-[0_0_8px_var(--water)]" : "bg-fire"}`} />
      <div className="leading-tight">
        <p className="hidden text-xs font-bold sm:block">Claude Haiku · 게스트</p>
        <p className="whitespace-nowrap text-[0.7rem] font-bold sm:hidden">게스트</p>
        <p className="whitespace-nowrap text-[0.68rem] text-white/45">
          오늘 남은 연성 <span className={`font-bold tabular-nums ${left > 5 ? "text-white/80" : "text-fire"}`}>{left}</span>회
        </p>
      </div>
    </div>
  );
}

function AccountMenu({ user, plan, siwc, onLogout, onReset, onClearBoard, onModelChange }: Props & { user: UserView }) {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<ModelsResponse | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open || models || plan?.provider !== "chatgpt" || !plan.sharing) return;
    fetch("/api/models")
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body?.error?.message ?? `HTTP ${r.status}`);
        setModels(body as ModelsResponse);
        if (body.selected) onModelChange(body.selected);
      })
      .catch((e: Error) => setModelError(e.message));
  }, [open, models, plan, onModelChange]);

  const selectModel = async (slug: string) => {
    setModels((m) => (m ? { ...m, selected: slug } : m));
    onModelChange(slug);
    await fetch("/api/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
  };

  const initial = (user.name ?? user.email ?? "?").slice(0, 1).toUpperCase();

  return (
    <div ref={rootRef} className="pointer-events-auto relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="glass grid size-12 place-items-center overflow-hidden rounded-2xl transition hover:border-white/25"
        aria-label="계정 메뉴"
      >
        {user.picture ? (
          <img src={user.picture} alt="" className="size-8 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-wood via-water to-fire text-sm font-black text-black">
            {initial}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97, transition: { duration: 0.12 } }}
            transition={{ type: "spring", stiffness: 500, damping: 32 }}
            className="absolute right-0 top-14 w-72 origin-top-right rounded-2xl border border-white/10 bg-ink-900/[0.97] p-2 shadow-2xl backdrop-blur-xl"
          >
            <div className="px-3 py-2">
              <p className="truncate font-bold">{user.name ?? "연금술사"}</p>
              {user.email && <p className="truncate text-xs text-white/50">{user.email}</p>}
            </div>

            {plan?.provider === "chatgpt" && (
              <div className="mx-1 rounded-xl bg-white/[0.04] p-3">
                <p className="text-xs font-bold">
                  {plan.sharing ? "Using ChatGPT plan" : "ChatGPT 플랜 사용이 허용되지 않았어요"}
                </p>
                <p className="mt-0.5 text-[0.7rem] leading-snug text-white/50">
                  연성 요청은 ChatGPT 플랜 사용량을 사용합니다. API 키 비용은 발생하지 않아요.
                </p>
                {plan.sharing && (
                  <label className="mt-2.5 block">
                    <span className="text-[0.68rem] font-medium text-white/45">연성 모델</span>
                    {models ? (
                      <select
                        value={models.selected ?? ""}
                        onChange={(e) => void selectModel(e.target.value)}
                        className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-ink-800 px-2 text-sm outline-none"
                      >
                        {models.selected === null && <option value="">자동 선택</option>}
                        {models.models.map((m) => (
                          <option key={m.slug} value={m.slug}>
                            {m.displayName}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="mt-1 text-xs text-white/40">{modelError ?? "모델 목록 불러오는 중…"}</p>
                    )}
                  </label>
                )}
                <a
                  href={USAGE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2.5 inline-block text-xs font-bold text-water hover:underline"
                >
                  Manage usage ↗
                </a>
                {!plan.sharing && (
                  <a href="/auth/chatgpt" className="ml-3 inline-block text-xs font-bold text-gold hover:underline">
                    다시 허용하기
                  </a>
                )}
              </div>
            )}

            {plan?.provider === "claude" && (
              <div className="mx-1 rounded-xl bg-white/[0.04] p-3">
                <p className="text-xs font-bold">게스트 모드 · Claude Haiku 5.5</p>
                <p className="mt-0.5 text-[0.7rem] leading-snug text-white/50">
                  운영자 크레딧으로 제공되는 체험이에요. 오늘 남은 연성 {plan.remaining ?? 0}회. 이미 누군가 발견한 조합은 횟수에
                  포함되지 않아요.
                </p>
                {siwc && (
                  <>
                    <div className="mt-2.5">
                      <ChatGPTButton size="sm" />
                    </div>
                    <p className="mt-1.5 text-[0.68rem] text-white/40">로그인하면 지금까지 발견한 원소를 그대로 가져가요.</p>
                  </>
                )}
              </div>
            )}

            <div className="mt-1 flex flex-col">
              <MenuItem
                onClick={() => {
                  onClearBoard();
                  setOpen(false);
                }}
              >
                보드 정리
              </MenuItem>
              {confirmReset ? (
                <MenuItem
                  danger
                  onClick={() => {
                    setConfirmReset(false);
                    setOpen(false);
                    onReset();
                  }}
                >
                  정말 초기화할까요? (되돌릴 수 없어요)
                </MenuItem>
              ) : (
                <MenuItem onClick={() => setConfirmReset(true)}>연성 기록 초기화</MenuItem>
              )}
              {plan?.provider === "chatgpt" && (
                <MenuItem
                  onClick={() => {
                    setOpen(false);
                    onLogout();
                  }}
                >
                  로그아웃
                </MenuItem>
              )}
              {plan?.provider === "claude" &&
                (confirmLeave ? (
                  <MenuItem
                    danger
                    onClick={() => {
                      setConfirmLeave(false);
                      setOpen(false);
                      onLogout();
                    }}
                  >
                    종료하면 이 기록으로 돌아올 수 없어요. 종료할까요?
                  </MenuItem>
                ) : (
                  <MenuItem onClick={() => setConfirmLeave(true)}>게스트 종료</MenuItem>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-left text-sm transition hover:bg-white/[0.06] ${
        danger ? "font-bold text-fire" : "text-white/80"
      }`}
    >
      {children}
    </button>
  );
}
