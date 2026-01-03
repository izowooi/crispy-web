'use client';

import type { Stage } from '@/types/nonogram';
import { NonogramGrid } from './NonogramGrid';
import { RowHintsDisplay, ColHintsDisplay } from './HintDisplay';
import { ColorLegend } from './ColorLegend';
import { generateRowHints, generateColHints, getMaxHintLength } from '@/lib/nonogram';
import { getUsedColors } from '@/lib/colors';

interface PuzzlePageProps {
  stage: Stage;
  showAnswer?: boolean;
  cellSize?: number;
}

export function PuzzlePage({
  stage,
  showAnswer = false,
  cellSize = 24,
}: PuzzlePageProps) {
  const rowHints = generateRowHints(stage.grid);
  const colHints = generateColHints(stage.grid);
  const maxRowHintLength = getMaxHintLength(rowHints);
  const maxColHintLength = getMaxHintLength(colHints);
  const usedColors = getUsedColors(stage.grid);

  // 난이도 표시 (별)
  const difficultyStars = '★'.repeat(stage.difficulty) + '☆'.repeat(5 - stage.difficulty);

  return (
    <div className="puzzle-page w-full h-full flex flex-col items-center justify-center p-8 bg-white">
      {/* 헤더: 제목, 힌트, 난이도, 카테고리 */}
      <div className="text-center mb-6 w-full max-w-2xl">
        <h1 className="text-2xl font-bold mb-2">
          {showAnswer ? `${stage.title} (정답)` : stage.title}
        </h1>
        <p className="text-gray-600 mb-2">{stage.hint}</p>
        <div className="flex justify-center gap-4 text-sm text-gray-500">
          <span>카테고리: {stage.category}</span>
          <span>난이도: {difficultyStars}</span>
          <span>크기: {stage.size[0]}×{stage.size[1]}</span>
        </div>
      </div>

      {/* 노노그램 퍼즐 */}
      <div className="flex">
        {/* 왼쪽 상단 빈 공간 */}
        <div
          style={{
            width: maxRowHintLength * cellSize * 0.8 + 8,
            height: maxColHintLength * cellSize * 0.7 + 8,
          }}
        />

        {/* 열 힌트 (상단) */}
        <ColHintsDisplay
          hints={colHints}
          maxLength={maxColHintLength}
          cellSize={cellSize}
        />
      </div>

      <div className="flex">
        {/* 행 힌트 (좌측) */}
        <RowHintsDisplay
          hints={rowHints}
          maxLength={maxRowHintLength}
          cellSize={cellSize}
        />

        {/* 그리드 */}
        <NonogramGrid
          grid={stage.grid}
          showAnswer={showAnswer}
          cellSize={cellSize}
        />
      </div>

      {/* 색상 범례 */}
      <ColorLegend colors={usedColors} />
    </div>
  );
}
