"use client";

import { useId, useMemo, useState } from "react";
import { Dictionary } from "@/lib/i18n";
import { calcEntropy, entropyToLevel, estimateCharsetSize } from "@/lib/strength";
import { STRENGTH_LEVELS, getLevelMeta } from "@/lib/strengthLevels";

interface Props {
  dict: Dictionary;
}

export function PasswordChecker({ dict }: Props) {
  const [value, setValue] = useState("");
  const [visible, setVisible] = useState(true);
  const inputId = useId();

  const { entropy, level, hasInput } = useMemo(() => {
    if (!value) return { entropy: 0, level: 1 as const, hasInput: false };
    const charsetSize = estimateCharsetSize(value);
    const e = calcEntropy(value.length, charsetSize);
    return { entropy: e, level: entropyToLevel(e), hasInput: true };
  }, [value]);

  const meta = hasInput ? getLevelMeta(level) : null;
  const label = hasInput ? dict.strengthLevels[level - 1] : null;

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-900">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-stone-700 dark:text-stone-200">
          {dict.checkerTitle}
        </h2>
      </div>

      <div className="mt-4">
        <label htmlFor={inputId} className="sr-only">
          {dict.checkerTitle}
        </label>
        <div className="relative">
          <input
            id={inputId}
            type={visible ? "text" : "password"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={dict.checkerPlaceholder}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            dir="ltr"
            className="w-full rounded-lg border border-stone-300 bg-stone-50 px-4 py-3 pr-12 font-mono text-base text-stone-800 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:ring-stone-700"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? dict.checkerHide : dict.checkerShow}
            title={visible ? dict.checkerHide : dict.checkerShow}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-xl text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
          >
            {visible ? "🙈" : "👁️"}
          </button>
        </div>
        <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
          🔒 {dict.checkerPrivacyNote}
        </p>
      </div>

      <div className="mt-4" aria-live="polite">
        {hasInput && meta && label ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-4xl" role="img" aria-label={`level ${level}`}>
                  {meta.emoji}
                </span>
                <div className="flex flex-col">
                  <span className="text-base font-semibold text-stone-700 dark:text-stone-200">
                    {label}{" "}
                    <span className="text-xs font-normal text-stone-500 dark:text-stone-400">
                      ({level}/10)
                    </span>
                  </span>
                  <span className="font-mono text-xs text-stone-500 dark:text-stone-400">
                    {dict.entropyLabel}: {entropy.toFixed(1)} {dict.bitsUnit}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex gap-1">
              {STRENGTH_LEVELS.map((segment) => {
                const filled = segment.level <= level;
                return (
                  <div
                    key={segment.level}
                    className={`h-2.5 flex-1 rounded-sm transition ${
                      filled ? segment.barClass : "bg-stone-200 dark:bg-stone-700"
                    }`}
                  />
                );
              })}
            </div>

            <p className="mt-3 text-[11px] text-stone-400 dark:text-stone-500">
              {dict.checkerEntropyNote}
            </p>
          </>
        ) : (
          <p className="py-2 text-center text-sm text-stone-400 dark:text-stone-500">
            {dict.checkerEmptyHint}
          </p>
        )}
      </div>
    </div>
  );
}
