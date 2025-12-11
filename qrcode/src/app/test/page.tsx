import Link from "next/link";

const testPages: { href: string; title: string; description: string }[] = [
  {
    href: "/test/auth",
    title: "Google 로그인",
    description: "Supabase Auth를 사용한 Google OAuth 로그인 테스트",
  },
  {
    href: "/test/qr",
    title: "QR 코드 생성",
    description: "QR 라이브러리, WiFi 포맷, 이미지 생성 테스트",
  },
  {
    href: "/test/print",
    title: "출력 기능",
    description: "프린터 출력, PDF 생성, 이미지 다운로드 테스트",
  },
];

export default function TestDashboard() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href="/"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← 메인으로
          </Link>
          <h1 className="text-3xl font-bold mt-4">테스트 대시보드</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            각 기능별 독립 테스트 페이지입니다.
          </p>
        </div>

        <div className="grid gap-4">
          {testPages.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
            >
              <div>
                <h2 className="text-xl font-semibold">{page.title}</h2>
                <p className="mt-1 text-gray-600 dark:text-gray-400">
                  {page.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
