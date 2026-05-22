"use client";

import { useRef, useState } from "react";
import { X, GripVertical } from "lucide-react";
import { MEMO_COLORS } from "@/lib/types";
import type { Memo } from "@/lib/types";

interface Props {
  memo: Memo;
  boardRef: React.RefObject<HTMLDivElement | null>;
  onPositionChange: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
}

export default function MemoCard({ memo, boardRef, onPositionChange, onDelete }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startPos = useRef({ mouseX: 0, mouseY: 0, cardX: 0, cardY: 0 });
  const [localX, setLocalX] = useState(memo.pos_x);
  const [localY, setLocalY] = useState(memo.pos_y);

  const colorStyle = MEMO_COLORS[memo.color] ?? MEMO_COLORS.yellow;

  const startDrag = (clientX: number, clientY: number) => {
    dragging.current = true;
    startPos.current = { mouseX: clientX, mouseY: clientY, cardX: localX, cardY: localY };
  };

  const moveDrag = (clientX: number, clientY: number) => {
    if (!dragging.current || !boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const dx = clientX - startPos.current.mouseX;
    const dy = clientY - startPos.current.mouseY;
    const newX = Math.max(0, Math.min(90, startPos.current.cardX + (dx / rect.width) * 100));
    const newY = Math.max(0, Math.min(85, startPos.current.cardY + (dy / rect.height) * 100));
    setLocalX(newX);
    setLocalY(newY);
  };

  const endDrag = () => {
    if (!dragging.current) return;
    dragging.current = false;
    onPositionChange(memo.id, localX, localY);
  };

  return (
    <div
      ref={cardRef}
      className={`absolute w-44 min-h-28 rounded-lg shadow-md border ${colorStyle.bg} ${colorStyle.border} p-3 flex flex-col select-none`}
      style={{ left: `${localX}%`, top: `${localY}%` }}
      onMouseMove={(e) => moveDrag(e.clientX, e.clientY)}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      onTouchMove={(e) => { e.preventDefault(); moveDrag(e.touches[0].clientX, e.touches[0].clientY); }}
      onTouchEnd={endDrag}
    >
      {/* 드래그 핸들 */}
      <div
        className="flex items-center justify-between mb-1 cursor-grab active:cursor-grabbing"
        onMouseDown={(e) => { e.preventDefault(); startDrag(e.clientX, e.clientY); }}
        onTouchStart={(e) => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
      >
        <GripVertical size={12} className="text-gray-400" />
        <button
          onClick={() => onDelete(memo.id)}
          className="text-gray-400 hover:text-red-500 transition-colors"
        >
          <X size={12} />
        </button>
      </div>

      {/* 내용 */}
      <p className="text-sm text-gray-800 whitespace-pre-wrap break-words flex-1">{memo.content}</p>

      {/* 작성자 */}
      <p className="text-xs text-gray-500 mt-2 text-right">— {memo.author_name}</p>
    </div>
  );
}
