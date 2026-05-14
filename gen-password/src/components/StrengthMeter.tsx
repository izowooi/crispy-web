"use client";

import { useState } from "react";
import { Dictionary } from "@/lib/i18n";
import { StrengthLevel } from "@/lib/strength";
import { STRENGTH_LEVELS, getLevelMeta } from "@/lib/strengthLevels";

interface Props {
  level: StrengthLevel;
  entropy: number;
  dict: Dictionary;
}

export function StrengthMeter({ level, entropy, dict }: Props) {
  const meta = getLevelMeta(level);
  const label = dict.strengthLevels[level - 1];

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-900">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-stone-700 dark:text-stone-200">
          {dict.strengthTitle}
        </h2>
        <span className="font-mono text-xs text-stone-500 dark:text-stone-400">
          {dict.entropyLabel}: {entropy.toFixed(1)} {dict.bitsUnit}
        </span>
      </div>

      <div
        className="mt-4 flex flex-col items-center gap-3"
        aria-live="polite"
      >
        <LevelIcon level={level} emoji={meta.emoji} imageSrc={meta.imageSrc} />
        <span className="text-lg font-semibold text-stone-700 dark:text-stone-200">
          {label}{" "}
          <span className="text-sm font-normal text-stone-500 dark:text-stone-400">
            ({level}/10)
          </span>
        </span>
      </div>

      <div className="mt-4 flex gap-1">
        {STRENGTH_LEVELS.map((segment) => {
          const filled = segment.level <= level;
          return (
            <div
              key={segment.level}
              className={`h-3 flex-1 rounded-sm transition ${
                filled ? segment.barClass : "bg-stone-200 dark:bg-stone-700"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}

function LevelIcon({
  level,
  emoji,
  imageSrc,
}: {
  level: StrengthLevel;
  emoji: string;
  imageSrc: string;
}) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <span className="text-6xl" role="img" aria-label={`level ${level}`}>
        {emoji}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageSrc}
      alt={`level ${level}`}
      className="h-24 w-24 object-contain"
      onError={() => setErrored(true)}
    />
  );
}
