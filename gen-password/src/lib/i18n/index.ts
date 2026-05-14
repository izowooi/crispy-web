import { ar } from "./ar";
import { en } from "./en";
import { ja } from "./ja";
import { ko } from "./ko";
import { Dictionary, Locale, RTL_LOCALES } from "./types";
import { zh } from "./zh";

export { LOCALES, LOCALE_META, DEFAULT_LOCALE } from "./types";
export type { Locale, Dictionary, LocaleMeta } from "./types";

const DICTIONARIES: Record<Locale, Dictionary> = { ko, en, zh, ja, ar };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

export function isRtl(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale);
}
