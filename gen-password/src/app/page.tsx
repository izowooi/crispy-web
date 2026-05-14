"use client";

import { useEffect, useMemo, useState } from "react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { OptionsPanel } from "@/components/OptionsPanel";
import { PasswordDisplay } from "@/components/PasswordDisplay";
import { StrengthMeter } from "@/components/StrengthMeter";
import { Theme, ThemeToggle } from "@/components/ThemeToggle";
import { Toast, ToastVariant } from "@/components/Toast";
import { PasswordOptions, buildCharset } from "@/lib/charsets";
import { generatePassword } from "@/lib/generate";
import { DEFAULT_LOCALE, Locale, getDictionary, isRtl } from "@/lib/i18n";
import { calcEntropy, entropyToLevel } from "@/lib/strength";

const MIN_LENGTH = 4;
const MAX_LENGTH = 64;

const DEFAULT_OPTIONS: PasswordOptions = {
  length: 6,
  uppercase: false,
  lowercase: true,
  digits: true,
  symbols: false,
};

const STORAGE_LOCALE = "pg-locale";
const STORAGE_THEME = "pg-theme";

function readLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  return (localStorage.getItem(STORAGE_LOCALE) as Locale | null) ?? DEFAULT_LOCALE;
}

function readTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const saved = localStorage.getItem(STORAGE_THEME) as Theme | null;
  if (saved) return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function Page() {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const [theme, setTheme] = useState<Theme>("light");
  const [options, setOptions] = useState<PasswordOptions>(DEFAULT_OPTIONS);
  const [password, setPassword] = useState<string>("");
  const [toast, setToast] = useState<{ message: string; variant: ToastVariant } | null>(null);

  const dict = useMemo(() => getDictionary(locale), [locale]);
  const rtl = isRtl(locale);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setLocale(readLocale());
    setTheme(readTheme());
    setPassword(generatePassword(DEFAULT_OPTIONS));
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = rtl ? "rtl" : "ltr";
  }, [locale, rtl]);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const handleOptionsChange = (next: PasswordOptions) => {
    setOptions(next);
    setPassword(generatePassword(next));
  };

  const regenerate = () => {
    setPassword(generatePassword(options));
  };

  const charsetSize = buildCharset(options).length;
  const entropy = calcEntropy(options.length, charsetSize);
  const level = entropyToLevel(entropy);

  const handleLocaleChange = (next: Locale) => {
    setLocale(next);
    localStorage.setItem(STORAGE_LOCALE, next);
  };

  const handleThemeToggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem(STORAGE_THEME, next);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100 sm:text-3xl">
            {dict.appTitle}
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            {dict.appSubtitle}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <LanguageSelector locale={locale} onChange={handleLocaleChange} dict={dict} />
          <ThemeToggle theme={theme} onToggle={handleThemeToggle} dict={dict} />
        </div>
      </header>

      <PasswordDisplay
        password={password}
        dict={dict}
        onRefresh={regenerate}
        onCopySuccess={() => setToast({ message: dict.copiedToast, variant: "success" })}
        onCopyFail={() => setToast({ message: dict.copyFailedToast, variant: "error" })}
      />

      <StrengthMeter level={level} entropy={entropy} dict={dict} />

      <OptionsPanel
        options={options}
        onChange={handleOptionsChange}
        dict={dict}
        minLength={MIN_LENGTH}
        maxLength={MAX_LENGTH}
      />

      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}
    </main>
  );
}
