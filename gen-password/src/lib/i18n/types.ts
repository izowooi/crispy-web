export const LOCALES = ["ko", "en", "zh", "ja", "ar"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ko";
export const RTL_LOCALES: Locale[] = ["ar"];

export interface LocaleMeta {
  code: Locale;
  label: string;
  flag: string;
}

export const LOCALE_META: LocaleMeta[] = [
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
];

export interface Dictionary {
  appTitle: string;
  appSubtitle: string;
  passwordLabel: string;
  copyButton: string;
  copiedButton: string;
  copiedToast: string;
  copyFailedToast: string;
  refreshButton: string;
  refreshAria: string;
  optionsTitle: string;
  lengthLabel: string;
  uppercase: string;
  lowercase: string;
  digits: string;
  symbols: string;
  strengthTitle: string;
  strengthLevels: [string, string, string, string, string, string, string, string, string, string];
  entropyLabel: string;
  bitsUnit: string;
  themeLight: string;
  themeDark: string;
  languageSelector: string;
  minOneCharType: string;
}
