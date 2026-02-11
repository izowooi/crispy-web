import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Section from "@/components/layout/Section";
import Container from "@/components/layout/Container";
import LanguageToggle from "@/components/ui/LanguageToggle";
import LegalTabs from "@/components/ui/LegalTabs";
import { getLegalDocument, isValidLang } from "@/lib/legal";
import type { Lang } from "@/types";

export function generateStaticParams() {
  return [{ lang: "en" }, { lang: "ko" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  return {
    title: lang === "ko" ? "이용약관 - izowooi" : "Terms of Service - izowooi",
  };
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isValidLang(lang)) notFound();

  const doc = getLegalDocument(lang as Lang, "terms");

  return (
    <Section>
      <Container>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            {doc.title}
          </h1>
          <LanguageToggle currentLang={lang as Lang} currentType="terms" />
        </div>
        <p className="text-sm text-text-secondary mb-6">
          Effective: {doc.effectiveDate}
        </p>
        <LegalTabs currentType="terms" currentLang={lang as Lang} />
        <div className="max-w-3xl mt-10 space-y-8">
          {doc.sections.map((section, i) => (
            <div key={i}>
              <h2 className="text-xl font-medium mb-3">{section.heading}</h2>
              <p className="text-base leading-relaxed text-text-secondary">
                {section.content}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
