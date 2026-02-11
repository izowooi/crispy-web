import Section from "@/components/layout/Section";
import Container from "@/components/layout/Container";
import Card from "@/components/ui/Card";
import { values } from "@/data/values";

export default function ValuesSection() {
  return (
    <Section>
      <Container>
        <p className="text-sm font-medium tracking-widest uppercase text-text-secondary mb-4">
          Values
        </p>
        <h2 className="text-2xl md:text-3xl font-medium mb-10">
          What drives my work.
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((value) => (
            <Card key={value.title}>
              <div className="text-2xl mb-3">{value.icon}</div>
              <h3 className="text-base font-medium mb-2">{value.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                {value.description}
              </p>
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
}
