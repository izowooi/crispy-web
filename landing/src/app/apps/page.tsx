import type { Metadata } from "next";
import Image from "next/image";
import Section from "@/components/layout/Section";
import Container from "@/components/layout/Container";
import { apps } from "@/data/apps";

export const metadata: Metadata = {
  title: "Apps - izowooi",
  description: "High-quality apps designed for everyday joy",
};

export default function AppsPage() {
  return (
    <>
      <Section>
        <Container>
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
              Apps
            </h1>
            <p className="text-base md:text-lg text-text-secondary leading-relaxed">
              Two focused products, built with care.
            </p>
          </div>
        </Container>
      </Section>

      <Section className="pt-0">
        <Container>
          <div className="space-y-12">
            {apps.map((app) => (
              <div
                key={app.id}
                className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 md:gap-10 pb-12 border-b border-border last:border-b-0 last:pb-0"
              >
                <div className="relative aspect-square rounded-lg overflow-hidden bg-neutral-100">
                  <Image
                    src={app.image}
                    alt={app.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col justify-center">
                  <h2 className="text-xl md:text-2xl font-medium mb-2">
                    {app.name}
                  </h2>
                  <p className="text-base text-text-secondary leading-relaxed mb-4">
                    {app.descriptionShort || app.tagline}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {app.links.appStoreUrl && (
                      <a
                        href={app.links.appStoreUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block"
                      >
                        <Image
                          src="/images/badge-appstore.svg"
                          alt="Download on the App Store"
                          width={135}
                          height={40}
                        />
                      </a>
                    )}
                    {app.links.googlePlayUrl && (
                      <a
                        href={app.links.googlePlayUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block"
                      >
                        <Image
                          src="/images/badge-googleplay.svg"
                          alt="Get it on Google Play"
                          width={135}
                          height={40}
                        />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section className="pt-0">
        <Container>
          <p className="text-center text-text-secondary text-sm">
            Try them and tell me what you think.
          </p>
        </Container>
      </Section>
    </>
  );
}
