"use client";

import Link from "next/link";
import type { Lang, LegalType } from "@/types";

interface LanguageToggleProps {
  currentLang: Lang;
  currentType: LegalType;
}

export default function LanguageToggle({
  currentLang,
  currentType,
}: LanguageToggleProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Link
        href={`/en/${currentType}`}
        scroll={false}
        className={`transition-colors duration-150 ${
          currentLang === "en"
            ? "font-medium text-foreground"
            : "text-text-secondary hover:text-foreground"
        }`}
      >
        EN
      </Link>
      <span className="text-border">|</span>
      <Link
        href={`/ko/${currentType}`}
        scroll={false}
        className={`transition-colors duration-150 ${
          currentLang === "ko"
            ? "font-medium text-foreground"
            : "text-text-secondary hover:text-foreground"
        }`}
      >
        KR
      </Link>
    </div>
  );
}
