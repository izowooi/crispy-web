import { Studio } from "@/components/studio";
import { ThemeToggle } from "@/components/theme-toggle";

function BrandMark() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

export default function Home() {
  return (
    <div className="app-shell relative min-h-screen overflow-x-clip">
      <div className="ambient-glow ambient-glow-one" aria-hidden="true" />
      <div className="ambient-glow ambient-glow-two" aria-hidden="true" />

      <header className="relative z-20 border-b border-[var(--line-soft)] bg-[color:var(--canvas-glass)] backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <a
            href="#top"
            className="group flex items-center gap-2.5 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
            aria-label="리얼 프레임 홈"
          >
            <BrandMark />
            <span className="text-sm font-semibold tracking-[-0.03em] text-[var(--ink)]">리얼 프레임</span>
          </a>
          <ThemeToggle />
        </div>
      </header>

      <main id="top" className="relative z-10"><Studio /></main>

      <footer className="relative z-10 mx-auto max-w-[1440px] px-4 py-5 text-center text-[11px] leading-5 text-[var(--muted)] sm:px-6 lg:px-8">
        이미지는 결과 생성에만 사용하며 저장하지 않습니다. 개인정보를 소중히 다룹니다.
      </footer>
    </div>
  );
}
