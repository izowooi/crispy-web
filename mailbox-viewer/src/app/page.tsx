import { Dashboard } from "@/components/Dashboard";

export default function Home() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">쿠팡 소비 대시보드</h1>
        <p className="mt-1 text-sm text-slate-500">
          메일함에서 가져온 구매 내역 기반 개인용 통계
        </p>
      </header>
      <Dashboard />
    </div>
  );
}
