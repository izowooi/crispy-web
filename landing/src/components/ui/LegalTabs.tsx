"use client";

import Link from "next/link";
import type { Lang, LegalType } from "@/types";

interface LegalTabsProps {
  currentType: LegalType;
  currentLang: Lang;
}

const tabs: { type: LegalType; label: string }[] = [
  { type: "terms", label: "Terms of Service" },
  { type: "privacy", label: "Privacy Policy" },
];

export default function LegalTabs({ currentType, currentLang }: LegalTabsProps) {
  return (
    <div role="tablist" className="flex gap-6 border-b border-border">
      {tabs.map((tab) => (
        <Link
          key={tab.type}
          href={`/${currentLang}/${tab.type}`}
          scroll={false}
          role="tab"
          aria-selected={currentType === tab.type}
          className={`pb-3 text-sm transition-colors duration-150 ${
            currentType === tab.type
              ? "border-b-2 border-foreground font-medium text-foreground"
              : "text-text-secondary hover:text-foreground"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
