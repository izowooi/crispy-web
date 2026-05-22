"use client";

import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import MemoCard from "@/components/MemoCard";
import AddMemoModal from "@/components/AddMemoModal";
import type { Board, Memo, MemoColor } from "@/lib/types";

interface Props {
  boardId: string;
}

export default function MemoBoard({ boardId }: Props) {
  const [board, setBoard] = useState<Board | null>(null);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    const [{ data: boardData }, { data: memoData }] = await Promise.all([
      supabase.from("cm_boards").select("*").eq("id", boardId).single(),
      supabase.from("cm_memos").select("*").eq("board_id", boardId).order("created_at"),
    ]);
    if (!boardData) { setNotFound(true); setLoading(false); return; }
    setBoard(boardData);
    setMemos(memoData ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel(`cm_memos_board_${boardId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cm_memos", filter: `board_id=eq.${boardId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setMemos((prev) => [...prev, payload.new as Memo]);
          } else if (payload.eventType === "UPDATE") {
            setMemos((prev) =>
              prev.map((m) => (m.id === (payload.new as Memo).id ? (payload.new as Memo) : m))
            );
          } else if (payload.eventType === "DELETE") {
            setMemos((prev) => prev.filter((m) => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [boardId]);

  const handleAddMemo = async (content: string, author: string, color: MemoColor) => {
    // 새 메모는 화면 중앙 근처 랜덤 위치에 배치
    const pos_x = 20 + Math.random() * 50;
    const pos_y = 10 + Math.random() * 50;
    await supabase.from("cm_memos").insert({
      board_id: boardId,
      content,
      author_name: author,
      color,
      pos_x,
      pos_y,
    });
  };

  const handlePositionChange = async (id: string, x: number, y: number) => {
    // 로컬 상태는 MemoCard 내부에서 이미 업데이트됨
    await supabase
      .from("cm_memos")
      .update({ pos_x: x, pos_y: y, updated_at: new Date().toISOString() })
      .eq("id", id);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("cm_memos").delete().eq("id", id);
  };

  if (loading) return <div className="p-8 text-center text-gray-500">불러오는 중…</div>;
  if (notFound) return (
    <div className="p-8 text-center">
      <p className="text-gray-500">존재하지 않는 보드입니다.</p>
      <a href="/" className="text-indigo-600 hover:underline mt-2 inline-block">← 목록으로</a>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-57px)]">
      {/* 보드 헤더 */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
        <div>
          <a href="/" className="text-xs text-gray-400 hover:text-gray-600">← 목록</a>
          <h1 className="text-lg font-bold text-gray-800">{board?.name}</h1>
          {board?.description && <p className="text-xs text-gray-400">{board.description}</p>}
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          메모 추가
        </button>
      </div>

      {/* 자유 배치 캔버스 */}
      <div
        ref={boardRef}
        className="relative flex-1 overflow-hidden bg-gray-100"
        style={{ backgroundImage: "radial-gradient(circle, #d1d5db 1px, transparent 1px)", backgroundSize: "28px 28px" }}
      >
        {memos.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 pointer-events-none">
            <div className="text-center">
              <p className="text-4xl mb-2">🗒️</p>
              <p>메모를 추가해 보세요!</p>
            </div>
          </div>
        )}
        {memos.map((memo) => (
          <MemoCard
            key={memo.id}
            memo={memo}
            boardRef={boardRef}
            onPositionChange={handlePositionChange}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {showAddModal && (
        <AddMemoModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddMemo}
        />
      )}
    </div>
  );
}
