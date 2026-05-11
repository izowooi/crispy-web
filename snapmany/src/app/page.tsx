"use client";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight">SnapMany</h1>
          <span className="text-xs text-muted">한 장의 사진으로 여러 스타일을</span>
        </div>
      </header>

      <section className="flex-1 max-w-5xl w-full mx-auto px-4 py-12">
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted">UI 구현 중 (Phase 3에서 채워짐)</p>
        </div>
      </section>
    </main>
  );
}
