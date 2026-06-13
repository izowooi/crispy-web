"use client";

import { useTransition } from "react";
import { deleteArchive, setPrivate } from "@/app/actions";

interface Props {
  id: string;
  isPrivate: boolean;
}

export default function ArchiveRowActions({ id, isPrivate }: Props) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("이 아카이브를 삭제하시겠습니까? (복구 불가)")) return;
    startTransition(() => deleteArchive(id));
  }

  function handleTogglePrivate() {
    startTransition(() => setPrivate(id, !isPrivate));
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        onClick={handleTogglePrivate}
        disabled={pending}
        title={isPrivate ? "공개로 변경" : "비공개로 변경"}
        className="rounded px-2 py-1 text-xs transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40"
      >
        {isPrivate ? "🔒" : "🌐"}
      </button>
      <button
        onClick={handleDelete}
        disabled={pending}
        title="삭제"
        className="rounded px-2 py-1 text-xs text-red-600 transition-colors hover:bg-gray-100 hover:text-red-700 dark:text-red-500 dark:hover:bg-gray-800 dark:hover:text-red-400 disabled:opacity-40"
      >
        삭제
      </button>
    </div>
  );
}
