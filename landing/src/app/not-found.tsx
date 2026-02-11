import Section from "@/components/layout/Section";
import Container from "@/components/layout/Container";
import Button from "@/components/ui/Button";

export default function NotFound() {
  return (
    <Section>
      <Container>
        <div className="flex flex-col items-center text-center">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
            Page not found
          </h1>
          <p className="text-base text-text-secondary leading-relaxed mb-8">
            요청하신 페이지를 찾을 수 없습니다.
          </p>
          <Button href="/">Go Home</Button>
        </div>
      </Container>
    </Section>
  );
}
