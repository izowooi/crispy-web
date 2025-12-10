import Link from "next/link";

type TestStatus = "ready" | "config-needed";

const testPages: { href: string; title: string; description: string; status: TestStatus }[] = [
  {
    href: "/test/qr",
    title: "QR 코드 생성",
    description: "QR 라이브러리, WiFi 포맷, 이미지 생성, WebP 변환 테스트",
    status: "ready",
  },
  {
    href: "/test/auth",
    title: "인증 (Supabase Auth)",
    description: "Supabase 초기화, Google 로그인, 세션, 로그아웃 테스트",
    status: "config-needed",
  },
  {
    href: "/test/appcheck",
    title: "Firebase App Check",
    description: "Firebase 초기화, App Check 토큰 획득/검증 테스트",
    status: "config-needed",
  },
  {
    href: "/test/upload",
    title: "R2 업로드",
    description: "Next.js API 호출, 인증 포함 업로드, 에러 핸들링 테스트",
    status: "config-needed",
  },
  {
    href: "/test/database",
    title: "데이터베이스 (Supabase)",
    description: "DB 연결, RLS 검증, 데이터 삽입/조회 테스트",
    status: "config-needed",
  },
  {
    href: "/test/print",
    title: "출력 기능",
    description: "프린터 출력, PDF 생성, WebP 다운로드 테스트",
    status: "ready",
  },
];

const statusBadge: Record<TestStatus, { label: string; className: string }> = {
  ready: {
    label: "테스트 가능",
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
  "config-needed": {
    label: "설정 필요",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  },
};

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
          <h1 className="text-3xl font-bold mt-4">TDD 테스트 대시보드</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            각 기능별 독립 테스트 페이지입니다. 콘솔 설정 후 테스트하세요.
          </p>
        </div>

        <div className="grid gap-4">
          {testPages.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{page.title}</h2>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">
                    {page.description}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded ${statusBadge[page.status].className}`}
                >
                  {statusBadge[page.status].label}
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="font-semibold text-blue-800 dark:text-blue-300">
            설정 가이드
          </h3>
          <p className="mt-2 text-sm text-blue-700 dark:text-blue-400">
            &quot;설정 필요&quot; 상태의 테스트를 실행하려면 먼저 해당 서비스의 콘솔
            설정을 완료하고 환경변수를 입력해야 합니다. 자세한 내용은{" "}
            <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">
              .env.example
            </code>{" "}
            파일을 참고하세요.
          </p>
        </div>
      </div>
    </main>
  );
}
