export const runtime = "edge";

export default function NotFound() {
  return (
    <div className="py-16 text-center text-gray-500">
      <p className="text-4xl mb-4">🔍</p>
      <p className="text-lg">페이지를 찾을 수 없습니다.</p>
      <a href="/" className="mt-4 inline-block text-blue-400 hover:text-blue-300 text-sm">
        ← 목록으로 돌아가기
      </a>
    </div>
  );
}
