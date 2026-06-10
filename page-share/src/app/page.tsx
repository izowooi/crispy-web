import type { Archive } from "@/types/archive";
import { isAdminSession } from "@/lib/admin";
import ArchiveRowActions from "@/components/archive-row-actions";

async function getArchives(admin: boolean): Promise<Archive[]> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:52741";
  const res = await fetch(`${baseUrl}/api/archives`, { cache: "no-store" });
  if (!res.ok) return [];
  const json = await res.json();
  return json.archives ?? [];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function HomePage() {
  const admin = await isAdminSession();
  const archives = await getArchives(admin);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">아카이브 목록</h1>
        <p className="text-sm text-gray-400">
          총 {archives.length}개 · 크롬 익스텐션으로 페이지를 저장하세요
        </p>
      </div>

      {archives.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-700 py-16 text-center text-gray-500">
          <p className="text-4xl mb-4">📭</p>
          <p className="text-lg">아직 저장된 페이지가 없습니다.</p>
          <p className="mt-1 text-sm">크롬 익스텐션의 &ldquo;Save Page&rdquo; 버튼으로 페이지를 저장해 보세요.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-400">제목</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400 hidden md:table-cell">원본 URL</th>
                <th className="px-4 py-3 text-right font-medium text-gray-400 hidden sm:table-cell">크기</th>
                <th className="px-4 py-3 text-right font-medium text-gray-400">저장일</th>
                {admin && (
                  <th className="px-4 py-3 text-right font-medium text-gray-400">관리</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {archives.map((archive) => (
                <tr
                  key={archive.id}
                  className={`hover:bg-gray-900/60 transition-colors ${archive.is_private ? "opacity-60" : ""}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {archive.is_private && (
                        <span title="비공개" className="shrink-0 text-xs">🔒</span>
                      )}
                      <a
                        href={`/archive/${archive.id}`}
                        className="font-medium text-blue-400 hover:text-blue-300 line-clamp-1"
                      >
                        {archive.title}
                      </a>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <a
                      href={archive.original_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-gray-300 truncate block max-w-xs"
                    >
                      {archive.original_url}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell">
                    {formatSize(archive.file_size)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 whitespace-nowrap">
                    {formatDate(archive.created_at)}
                  </td>
                  {admin && (
                    <td className="px-4 py-3 text-right">
                      <ArchiveRowActions id={archive.id} isPrivate={archive.is_private} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
