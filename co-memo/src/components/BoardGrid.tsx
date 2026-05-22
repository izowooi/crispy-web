"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Board } from "@/lib/types";

export default function BoardGrid() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchBoards = async () => {
    const { data } = await supabase
      .from("cm_boards")
      .select("*")
      .order("created_at", { ascending: false });
    setBoards(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchBoards();

    const channel = supabase
      .channel("cm_boards_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "cm_boards" }, () => {
        fetchBoards();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    await supabase.from("cm_boards").insert({ name: name.trim(), description: description.trim() });
    setName("");
    setDescription("");
    setShowForm(false);
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("보드를 삭제하면 메모도 모두 삭제됩니다. 계속할까요?")) return;
    await supabase.from("cm_boards").delete().eq("id", id);
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">불러오는 중…</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">협업 보드</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          새 보드
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form
            onSubmit={handleCreate}
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md"
          >
            <h2 className="text-lg font-bold mb-4">새 보드 만들기</h2>
            <input
              type="text"
              placeholder="보드 이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              autoFocus
              required
            />
            <textarea
              placeholder="설명 (선택)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
              >
                {submitting ? "만드는 중…" : "만들기"}
              </button>
            </div>
          </form>
        </div>
      )}

      {boards.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-3">📋</p>
          <p>아직 보드가 없어요. 첫 번째 보드를 만들어 보세요!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map((board) => (
            <div
              key={board.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col"
            >
              <div className="flex items-start justify-between mb-2">
                <h2 className="text-base font-semibold text-gray-800 break-words">{board.name}</h2>
                <button
                  onClick={(e) => { e.preventDefault(); handleDelete(board.id); }}
                  className="text-gray-300 hover:text-red-400 ml-2 shrink-0 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
              {board.description && (
                <p className="text-xs text-gray-400 mb-3 break-words">{board.description}</p>
              )}
              <div className="mt-auto pt-3">
                <a
                  href={`/board/${board.id}`}
                  className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                >
                  보드 열기 <ArrowRight size={14} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
