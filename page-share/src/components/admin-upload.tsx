"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function AdminUpload() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [title, setTitle] = useState("");
  const [originalUrl, setOriginalUrl] = useState("");
  const [status, setStatus] = useState<{ type: "error" | "success"; msg: string } | null>(null);
  const [uploading, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    if (!title) setTitle(f.name.replace(/\.html?$/i, ""));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { setStatus({ type: "error", msg: "파일을 선택하세요" }); return; }

    setStatus(null);
    const form = new FormData();
    form.append("file", file);
    form.append("title", title);
    form.append("original_url", originalUrl);

    startTransition(async () => {
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        setStatus({ type: "error", msg: json.error ?? "업로드 실패" });
        return;
      }
      setStatus({ type: "success", msg: `저장 완료: ${json.archive?.title}` });
      // reset form
      setFileName("");
      setTitle("");
      setOriginalUrl("");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    });
  }

  return (
    <div>
      <button
        onClick={() => { setOpen((v) => !v); setStatus(null); }}
        className="rounded px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
      >
        HTML 업로드 {open ? "▲" : "▼"}
      </button>

      {open && (
        <div className="mt-3 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex-shrink-0">
                <span className="sr-only">HTML 파일 선택</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".html,.htm"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <span
                  role="button"
                  onClick={() => fileRef.current?.click()}
                  className="cursor-pointer rounded border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors select-none"
                >
                  파일 선택
                </span>
              </label>
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                {fileName || "선택된 파일 없음"}
              </span>
            </div>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목 (선택 — 비워두면 파일명 사용)"
              className="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-gray-400 dark:focus:border-gray-500"
            />

            <input
              type="url"
              value={originalUrl}
              onChange={(e) => setOriginalUrl(e.target.value)}
              placeholder="원본 URL (선택)"
              className="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-gray-400 dark:focus:border-gray-500"
            />

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={uploading}
                className="rounded bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {uploading ? "업로드 중…" : "업로드"}
              </button>
              {status && (
                <span className={`text-xs ${status.type === "error" ? "text-red-500 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                  {status.msg}
                </span>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
