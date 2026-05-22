"use client";

import { useState } from "react";
import { MEMO_COLORS } from "@/lib/types";
import type { MemoColor } from "@/lib/types";

interface Props {
  onClose: () => void;
  onSubmit: (content: string, author: string, color: MemoColor) => Promise<void>;
}

export default function AddMemoModal({ onClose, onSubmit }: Props) {
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState(() => localStorage.getItem("cm_author") ?? "");
  const [color, setColor] = useState<MemoColor>("yellow");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !author.trim()) return;
    setSubmitting(true);
    localStorage.setItem("cm_author", author.trim());
    await onSubmit(content.trim(), author.trim(), color);
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md"
      >
        <h2 className="text-lg font-bold mb-4">메모 추가</h2>

        <input
          type="text"
          placeholder="이름"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          required
          autoFocus
        />

        <textarea
          placeholder="메모 내용"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
          required
        />

        <div className="flex gap-2 mb-4">
          {(Object.entries(MEMO_COLORS) as [MemoColor, typeof MEMO_COLORS[MemoColor]][]).map(
            ([key, val]) => (
              <button
                key={key}
                type="button"
                onClick={() => setColor(key)}
                title={val.label}
                className={`w-7 h-7 rounded-full border-2 ${val.bg} transition-transform ${
                  color === key ? "border-gray-700 scale-110" : "border-transparent"
                }`}
              />
            )
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
          >
            {submitting ? "추가 중…" : "추가"}
          </button>
        </div>
      </form>
    </div>
  );
}
