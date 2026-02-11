import Image from "next/image";
import Section from "@/components/layout/Section";
import Container from "@/components/layout/Container";
import Button from "@/components/ui/Button";

export default function HeroSection() {
  return (
    <Section>
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="order-2 lg:order-1">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
              Build delightful experiences.
            </h1>
            <p className="text-base md:text-lg text-text-secondary leading-relaxed mb-8">
              I craft playful digital products with a focus on quality and
              longevity. AI와 자동화로 제작 효율을 혁신합니다.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button href="/apps">Explore Apps</Button>
              <Button href="/about-me" variant="secondary">
                Learn more
              </Button>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-neutral-100">
              <Image
                src="/images/hero-kv.jpg"
                alt="izowooi hero visual"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
