export interface Board {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface Memo {
  id: string;
  board_id: string;
  content: string;
  author_name: string;
  color: MemoColor;
  pos_x: number;
  pos_y: number;
  created_at: string;
  updated_at: string;
}

export type MemoColor = "yellow" | "pink" | "green" | "blue" | "purple";

export const MEMO_COLORS: Record<MemoColor, { bg: string; border: string; label: string }> = {
  yellow: { bg: "bg-yellow-200", border: "border-yellow-300", label: "노랑" },
  pink:   { bg: "bg-pink-200",   border: "border-pink-300",   label: "분홍" },
  green:  { bg: "bg-green-200",  border: "border-green-300",  label: "초록" },
  blue:   { bg: "bg-blue-200",   border: "border-blue-300",   label: "파랑" },
  purple: { bg: "bg-purple-200", border: "border-purple-300", label: "보라" },
};
