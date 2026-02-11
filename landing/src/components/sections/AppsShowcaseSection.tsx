import Image from "next/image";
import Section from "@/components/layout/Section";
import Container from "@/components/layout/Container";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { apps } from "@/data/apps";

export default function AppsShowcaseSection() {
  return (
    <Section>
      <Container>
        <p className="text-sm font-medium tracking-widest uppercase text-text-secondary mb-4">
          Apps
        </p>
        <h2 className="text-2xl md:text-3xl font-medium mb-2">
          High-quality apps designed for everyday joy.
        </h2>
        <p className="text-base text-text-secondary leading-relaxed mb-10">
          매일 사용하는 앱을 정성껏 만들고 있습니다.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
          {apps.map((app) => (
            <Card key={app.id}>
              <div className="relative aspect-[16/9] rounded-md overflow-hidden bg-neutral-100 mb-4">
                <Image
                  src={app.image}
                  alt={app.name}
                  fill
                  className="object-cover"
                />
              </div>
              <h3 className="text-lg font-medium mb-1">{app.name}</h3>
              <p className="text-sm text-text-secondary leading-relaxed mb-3">
                {app.tagline}
              </p>
              {app.tags && (
                <div className="flex flex-wrap gap-2">
                  {app.tags.map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button href="/apps">Explore Apps</Button>
        </div>
      </Container>
    </Section>
  );
}
