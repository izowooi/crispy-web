'use client';

import { getColorHex } from '@/lib/colors';

interface NonogramGridProps {
  grid: number[][];
  showAnswer: boolean;
  cellSize?: number;
}

export function NonogramGrid({
  grid,
  showAnswer,
  cellSize = 24,
}: NonogramGridProps) {
  const rows = grid.length;
  const cols = grid[0]?.length || 0;

  return (
    <div
      className="inline-block border-2 border-black"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
      }}
    >
      {grid.map((row, rowIndex) =>
        row.map((cell, colIndex) => {
          // 5x5 구분선용 굵은 테두리 계산
          const isThickRight = (colIndex + 1) % 5 === 0 && colIndex !== cols - 1;
          const isThickBottom = (rowIndex + 1) % 5 === 0 && rowIndex !== rows - 1;

          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              className="box-border"
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: showAnswer ? getColorHex(cell) : 'white',
                borderRight: isThickRight
                  ? '2px solid black'
                  : '1px solid #ccc',
                borderBottom: isThickBottom
                  ? '2px solid black'
                  : '1px solid #ccc',
              }}
            />
          );
        })
      )}
    </div>
  );
}
