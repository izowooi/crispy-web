import type { Metadata } from "next";
import Image from "next/image";
import Section from "@/components/layout/Section";
import Container from "@/components/layout/Container";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import { apps } from "@/data/apps";

export const metadata: Metadata = {
  title: "About Me - izowooi",
  description: "14년차 개발자 izowooi",
};

const expertise = [
  "Android / Java",
  "Unity / C#",
  "Firebase / Supabase",
  "Jenkins / CI-CD",
  "ComfyUI",
  "AI 기반 콘텐츠 자동화",
];

export default function AboutMePage() {
  return (
    <>
      <Section>
        <Container>
          <div className="max-w-3xl">
            <p className="text-sm font-medium tracking-widest uppercase text-text-secondary mb-4">
              Developer
            </p>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
              izowooi
            </h1>
            <p className="text-base md:text-lg text-text-secondary leading-relaxed">
              AI와 자동화로 제작 효율을 혁신합니다.
            </p>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <div className="max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-medium mb-4">About Me</h2>
            <p className="text-base text-text-secondary leading-relaxed">
              14년차 개발자입니다. 아키텍처 설계부터 라이브 운영까지 폭넓은
              경험을 보유하고 있습니다. 모바일 앱 개발부터 게임 개발, 백엔드
              인프라, 그리고 최근에는 AI 기반 콘텐츠 자동화까지 다양한 영역에서
              일해왔습니다.
            </p>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <div className="max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-medium mb-6">Expertise</h2>
            <div className="flex flex-wrap gap-3">
              {expertise.map((skill) => (
                <Badge key={skill}>{skill}</Badge>
              ))}
            </div>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <div className="max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-medium mb-6">Projects</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {app.tagline}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <div className="max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-medium mb-6">Contact</h2>
            <div className="flex flex-col gap-3 text-base">
              <p>
                <span className="text-text-secondary">Email: </span>
                <a
                  href="mailto:izowooi@hotmail.com"
                  className="underline hover:text-accent transition-colors duration-150"
                >
                  izowooi@hotmail.com
                </a>
              </p>
              <p>
                <span className="text-text-secondary">GitHub: </span>
                <a
                  href="https://github.com/izowooi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-accent transition-colors duration-150"
                >
                  github.com/izowooi
                </a>
              </p>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
