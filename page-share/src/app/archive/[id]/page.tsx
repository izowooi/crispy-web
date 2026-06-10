import { notFound } from "next/navigation";
import type { Archive } from "@/types/archive";
import CopyButton from "./copy-button";

async function getArchive(id: string): Promise<Archive | null> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/archives/${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  const json = await res.json();
  return json.archive ?? null;
}

export default async function ArchivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const archive = await getArchive(id);
  if (!archive) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const shareUrl = `${baseUrl}/archive/${id}`;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-tight truncate">{archive.title}</h1>
          <a
            href={archive.original_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block text-sm text-gray-500 hover:text-gray-300 truncate"
          >
            {archive.original_url}
          </a>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <CopyButton text={shareUrl} />
          <a
            href="/"
            className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm hover:bg-gray-800 transition-colors"
          >
            ← 목록
          </a>
        </div>
      </div>

      <div className="rounded-xl border border-gray-800 bg-white overflow-hidden">
        <iframe
          src={`/api/archives/${id}/raw`}
          sandbox="allow-same-origin allow-forms"
          className="w-full"
          style={{ height: "80vh", border: "none" }}
          title={archive.title}
        />
      </div>

      <p className="text-xs text-gray-600 text-right">
        저장일: {new Date(archive.created_at).toLocaleString("ko-KR")}
      </p>
    </div>
  );
}
