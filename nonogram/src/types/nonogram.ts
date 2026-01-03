export interface Stage {
  id: string;
  title: string;
  hint: string;
  category: string;
  difficulty: number;
  size: [number, number];
  palette: string[];
  grid: number[][];
}

export interface HintCell {
  count: number;
  color: number;
}

export type RowHints = HintCell[][];
export type ColHints = HintCell[][];
