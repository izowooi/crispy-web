import type { HintCell, RowHints, ColHints } from '@/types/nonogram';

/**
 * 행별 힌트 생성
 * 각 행을 스캔하여 연속된 같은 색상의 셀 개수를 계산
 */
export function generateRowHints(grid: number[][]): RowHints {
  return grid.map((row) => {
    const hints: HintCell[] = [];
    let count = 0;
    let currentColor = 0;

    for (const cell of row) {
      if (cell === 0) {
        // 공백을 만나면 이전 색상 힌트 저장
        if (count > 0) {
          hints.push({ count, color: currentColor });
        }
        count = 0;
        currentColor = 0;
      } else if (cell === currentColor) {
        // 같은 색상이면 카운트 증가
        count++;
      } else {
        // 다른 색상이면 이전 힌트 저장하고 새로 시작
        if (count > 0) {
          hints.push({ count, color: currentColor });
        }
        count = 1;
        currentColor = cell;
      }
    }

    // 마지막 힌트 저장
    if (count > 0) {
      hints.push({ count, color: currentColor });
    }

    // 힌트가 없으면 0 표시
    return hints.length > 0 ? hints : [{ count: 0, color: 0 }];
  });
}

/**
 * 열별 힌트 생성
 * 각 열을 스캔하여 연속된 같은 색상의 셀 개수를 계산
 */
export function generateColHints(grid: number[][]): ColHints {
  if (grid.length === 0) return [];

  const numCols = grid[0].length;
  const colHints: ColHints = [];

  for (let col = 0; col < numCols; col++) {
    const hints: HintCell[] = [];
    let count = 0;
    let currentColor = 0;

    for (let row = 0; row < grid.length; row++) {
      const cell = grid[row][col];

      if (cell === 0) {
        if (count > 0) {
          hints.push({ count, color: currentColor });
        }
        count = 0;
        currentColor = 0;
      } else if (cell === currentColor) {
        count++;
      } else {
        if (count > 0) {
          hints.push({ count, color: currentColor });
        }
        count = 1;
        currentColor = cell;
      }
    }

    if (count > 0) {
      hints.push({ count, color: currentColor });
    }

    colHints.push(hints.length > 0 ? hints : [{ count: 0, color: 0 }]);
  }

  return colHints;
}

/**
 * 힌트의 최대 길이 계산 (레이아웃용)
 */
export function getMaxHintLength(hints: HintCell[][]): number {
  return Math.max(...hints.map((h) => h.length), 1);
}
