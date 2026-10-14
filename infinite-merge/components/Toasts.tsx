"use client";

import { AnimatePresence, motion } from "motion/react";

export type ToastAction =
  | { label: string; href: string; external?: boolean; onClick?: never }
  | { label: string; onClick: () => void; href?: never; external?: never };

export type ToastSpec = {
  id: string;
  kind: "info" | "new" | "error";
  title: string;
  body?: string;
  action?: ToastAction;
};

export function Toasts({ toasts, onDismiss }: { toasts: ToastSpec[]; onDismiss: (id: string) => void }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[72px] z-50 flex flex-col items-center gap-2 px-4 md:right-[384px]">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96, transition: { duration: 0.16 } }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className={`glass pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl px-4 py-2.5 shadow-2xl ${
              t.kind === "error" ? "!border-fire/40" : t.kind === "new" ? "!border-gold/40" : ""
            }`}
            onClick={() => !t.action && onDismiss(t.id)}
          >
            {t.kind === "new" && <span className="text-[0.62rem] font-bold tracking-[0.2em] text-gold">NEW</span>}
            {t.kind === "error" && <span className="size-2 shrink-0 rounded-full bg-fire shadow-[0_0_10px_var(--fire)]" />}
            <div className="min-w-0">
              <p className="text-sm font-bold">{t.title}</p>
              {t.body && <p className="text-xs text-white/55">{t.body}</p>}
            </div>
            {t.action &&
              (t.action.href ? (
                <a
                  href={t.action.href}
                  target={t.action.external ? "_blank" : undefined}
                  rel={t.action.external ? "noreferrer" : undefined}
                  className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-black"
                >
                  {t.action.label}
                </a>
              ) : (
                <button
                  onClick={() => {
                    t.action?.onClick?.();
                    onDismiss(t.id);
                  }}
                  className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-black"
                >
                  {t.action.label}
                </button>
              ))}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
