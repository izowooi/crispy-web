import type { LegalDocument, Lang, LegalType } from "@/types";

import enTerms from "@/locales/en/terms.json";
import enPrivacy from "@/locales/en/privacy.json";
import koTerms from "@/locales/ko/terms.json";
import koPrivacy from "@/locales/ko/privacy.json";

const documents: Record<Lang, Record<LegalType, LegalDocument>> = {
  en: { terms: enTerms, privacy: enPrivacy },
  ko: { terms: koTerms, privacy: koPrivacy },
};

export function getLegalDocument(lang: Lang, type: LegalType): LegalDocument {
  return documents[lang][type];
}

export function isValidLang(lang: string): lang is Lang {
  return lang === "en" || lang === "ko";
}
