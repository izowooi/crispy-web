"use client";

import { PasswordOptions, activeCharsetKeys } from "@/lib/charsets";
import { Dictionary } from "@/lib/i18n";

interface Props {
  options: PasswordOptions;
  onChange: (next: PasswordOptions) => void;
  dict: Dictionary;
  minLength: number;
  maxLength: number;
}

type ToggleKey = "uppercase" | "lowercase" | "digits" | "symbols";

const TOGGLES: { key: ToggleKey; labelKey: keyof Pick<Dictionary, ToggleKey> }[] = [
  { key: "uppercase", labelKey: "uppercase" },
  { key: "lowercase", labelKey: "lowercase" },
  { key: "digits", labelKey: "digits" },
  { key: "symbols", labelKey: "symbols" },
];

export function OptionsPanel({ options, onChange, dict, minLength, maxLength }: Props) {
  const activeCount = activeCharsetKeys(options).length;
  const isLastActive = (key: ToggleKey) => activeCount === 1 && options[key];

  const setLength = (length: number) => {
    const clamped = Math.min(Math.max(length, minLength), maxLength);
    onChange({ ...options, length: clamped });
  };

  const toggle = (key: ToggleKey) => {
    if (isLastActive(key)) return;
    onChange({ ...options, [key]: !options[key] });
  };

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-900">
      <h2 className="text-base font-semibold text-stone-700 dark:text-stone-200">
        {dict.optionsTitle}
      </h2>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <label htmlFor="length" className="text-sm font-medium text-stone-600 dark:text-stone-300">
            {dict.lengthLabel}
          </label>
          <input
            type="number"
            value={options.length}
            min={minLength}
            max={maxLength}
            onChange={(e) => setLength(Number(e.target.value))}
            className="w-16 rounded-md border border-stone-200 bg-white px-2 py-1 text-right font-mono text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
            aria-label={dict.lengthLabel}
          />
        </div>
        <input
          id="length"
          type="range"
          min={minLength}
          max={maxLength}
          value={options.length}
          onChange={(e) => setLength(Number(e.target.value))}
          className="mt-3 w-full accent-sky-600"
          aria-label={dict.lengthLabel}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {TOGGLES.map(({ key, labelKey }) => {
          const checked = options[key];
          const disabled = isLastActive(key);
          return (
            <label
              key={key}
              className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition ${
                checked
                  ? "border-sky-500 bg-sky-50 text-sky-900 dark:border-sky-400 dark:bg-sky-950 dark:text-sky-100"
                  : "border-stone-200 bg-white text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
              } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(key)}
                className="h-4 w-4 accent-sky-600"
              />
              <span>{dict[labelKey]}</span>
            </label>
          );
        })}
      </div>

      {activeCount === 1 && (
        <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">
          {dict.minOneCharType}
        </p>
      )}
    </div>
  );
}
