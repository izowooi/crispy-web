"use client";

import { Locale, LOCALE_META, Dictionary } from "@/lib/i18n";

interface Props {
  locale: Locale;
  onChange: (locale: Locale) => void;
  dict: Dictionary;
}

export function LanguageSelector({ locale, onChange, dict }: Props) {
  return (
    <select
      value={locale}
      onChange={(e) => onChange(e.target.value as Locale)}
      aria-label={dict.languageSelector}
      dir="ltr"
      className="rounded-md border border-stone-200 bg-white px-2 py-1 text-sm text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
    >
      {LOCALE_META.map((meta) => (
        <option key={meta.code} value={meta.code}>
          {meta.flag} {meta.label}
        </option>
      ))}
    </select>
  );
}
