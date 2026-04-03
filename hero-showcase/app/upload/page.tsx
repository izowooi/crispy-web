import Link from "next/link";
import { UploadForm } from "@/components/UploadForm";

export default function UploadPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          목록으로
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
          새 영웅 등록
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          캐릭터 카드 HTML을 업로드하면 이름과 초상화가 자동으로 추출됩니다.
        </p>
      </div>
      <UploadForm />
    </div>
  );
}
