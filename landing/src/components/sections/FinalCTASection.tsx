import Section from "@/components/layout/Section";
import Container from "@/components/layout/Container";
import Button from "@/components/ui/Button";

export default function FinalCTASection() {
  return (
    <Section className="bg-neutral-50">
      <Container>
        <div className="flex flex-col items-center text-center">
          <h2 className="text-2xl md:text-3xl font-medium mb-4">
            Want to see what I&apos;m building?
          </h2>
          <p className="text-base text-text-secondary leading-relaxed mb-8">
            앱을 둘러보거나 저에 대해 더 알아보세요.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button href="/apps">Explore Apps</Button>
            <Button href="/about-me" variant="secondary">
              About me
            </Button>
          </div>
        </div>
      </Container>
    </Section>
  );
}
