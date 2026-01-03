'use client';

import type { HintCell, RowHints, ColHints } from '@/types/nonogram';
import { getTextColor } from '@/lib/colors';

interface RowHintsProps {
  hints: RowHints;
  maxLength: number;
  cellSize?: number;
}

export function RowHintsDisplay({
  hints,
  maxLength,
  cellSize = 24,
}: RowHintsProps) {
  return (
    <div className="flex flex-col">
      {hints.map((rowHint, rowIndex) => {
        // 5x5 구분선용
        const isThickBottom =
          (rowIndex + 1) % 5 === 0 && rowIndex !== hints.length - 1;

        return (
          <div
            key={rowIndex}
            className="flex items-center justify-end"
            style={{
              height: cellSize,
              gap: '2px',
              paddingRight: '4px',
              borderBottom: isThickBottom ? '2px solid black' : '1px solid transparent',
            }}
          >
            {/* 빈 공간 채우기 */}
            {Array.from({ length: maxLength - rowHint.length }).map((_, i) => (
              <span
                key={`empty-${i}`}
                style={{
                  width: cellSize * 0.8,
                  textAlign: 'center',
                }}
              />
            ))}
            {/* 힌트 숫자들 */}
            {rowHint.map((hint, hintIndex) => (
              <span
                key={hintIndex}
                className="font-bold text-sm"
                style={{
                  color: getTextColor(hint.color),
                  width: cellSize * 0.8,
                  textAlign: 'center',
                }}
              >
                {hint.count === 0 ? '-' : hint.count}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}

interface ColHintsProps {
  hints: ColHints;
  maxLength: number;
  cellSize?: number;
}

export function ColHintsDisplay({
  hints,
  maxLength,
  cellSize = 24,
}: ColHintsProps) {
  return (
    <div className="flex">
      {hints.map((colHint, colIndex) => {
        // 5x5 구분선용
        const isThickRight =
          (colIndex + 1) % 5 === 0 && colIndex !== hints.length - 1;

        return (
          <div
            key={colIndex}
            className="flex flex-col items-center justify-end"
            style={{
              width: cellSize,
              gap: '1px',
              paddingBottom: '4px',
              borderRight: isThickRight ? '2px solid black' : '1px solid transparent',
            }}
          >
            {/* 빈 공간 채우기 */}
            {Array.from({ length: maxLength - colHint.length }).map((_, i) => (
              <span
                key={`empty-${i}`}
                style={{
                  height: cellSize * 0.7,
                }}
              />
            ))}
            {/* 힌트 숫자들 */}
            {colHint.map((hint, hintIndex) => (
              <span
                key={hintIndex}
                className="font-bold text-xs"
                style={{
                  color: getTextColor(hint.color),
                  height: cellSize * 0.7,
                  lineHeight: `${cellSize * 0.7}px`,
                }}
              >
                {hint.count === 0 ? '-' : hint.count}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}
