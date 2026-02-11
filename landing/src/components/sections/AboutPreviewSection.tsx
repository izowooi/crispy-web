import Image from "next/image";
import Section from "@/components/layout/Section";
import Container from "@/components/layout/Container";
import Button from "@/components/ui/Button";

export default function AboutPreviewSection() {
  return (
    <Section>
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div>
            <p className="text-sm font-medium tracking-widest uppercase text-text-secondary mb-4">
              About me
            </p>
            <h2 className="text-2xl md:text-3xl font-medium mb-4">
              14년차 개발자
            </h2>
            <p className="text-base text-text-secondary leading-relaxed mb-6">
              아키텍처 설계부터 라이브 운영까지 경험한 개발자입니다. Android,
              Unity, Firebase부터 AI 기반 콘텐츠 자동화까지 다양한 기술 스택을
              다루고 있습니다.
            </p>
            <Button href="/about-me" variant="secondary">
              Learn More
            </Button>
          </div>
          <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-neutral-100">
            <Image
              src="/images/about-preview.jpg"
              alt="About izowooi"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </Container>
    </Section>
  );
}
