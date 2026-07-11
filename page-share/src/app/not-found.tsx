export const runtime = "edge";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-16 text-center text-gray-400 dark:text-gray-500">
      <p className="text-4xl mb-4">🔍</p>
      <p className="text-lg">페이지를 찾을 수 없습니다.</p>
      <Link href="/" className="mt-4 inline-block text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm">
        ← 목록으로 돌아가기
      </Link>
    </div>
  );
}
