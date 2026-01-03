'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Stage } from '@/types/nonogram';
import { getUsedColors, getColorHex } from '@/lib/colors';

export default function Home() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/stages.json')
      .then((res) => res.json())
      .then((data) => {
        setStages(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load stages:', err);
        setLoading(false);
      });
  }, []);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(stages.map((s) => s.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">노노그램 문제지</h1>
        <p className="text-gray-600 mb-6">
          출력할 문제를 선택한 후 인쇄 버튼을 클릭하세요.
        </p>

        {/* 선택 컨트롤 */}
        <div className="flex gap-4 mb-6 flex-wrap">
          <button
            onClick={selectAll}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            전체 선택
          </button>
          <button
            onClick={deselectAll}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            선택 해제
          </button>

          {selectedIds.size > 0 && (
            <>
              <Link
                href={`/print?ids=${Array.from(selectedIds).join(',')}&type=puzzle`}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                문제지 인쇄 ({selectedIds.size}개)
              </Link>
              <Link
                href={`/print?ids=${Array.from(selectedIds).join(',')}&type=answer`}
                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                답안지 인쇄 ({selectedIds.size}개)
              </Link>
              <Link
                href={`/print?ids=${Array.from(selectedIds).join(',')}&type=both`}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                문제+답안 인쇄 ({selectedIds.size}개)
              </Link>
            </>
          )}
        </div>

        {/* 문제 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {stages.map((stage) => (
            <StageCard
              key={stage.id}
              stage={stage}
              selected={selectedIds.has(stage.id)}
              onToggle={() => toggleSelection(stage.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface StageCardProps {
  stage: Stage;
  selected: boolean;
  onToggle: () => void;
}

function StageCard({ stage, selected, onToggle }: StageCardProps) {
  const usedColors = getUsedColors(stage.grid);
  const difficultyStars = '★'.repeat(stage.difficulty) + '☆'.repeat(5 - stage.difficulty);

  return (
    <div
      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
        selected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 bg-white hover:border-gray-400'
      }`}
      onClick={onToggle}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="mt-1 w-5 h-5"
          onClick={(e) => e.stopPropagation()}
        />
        <div className="flex-1">
          <h3 className="font-bold text-lg">{stage.title}</h3>
          <p className="text-sm text-gray-600 mb-2">{stage.hint}</p>
          <div className="text-xs text-gray-500 space-y-1">
            <p>카테고리: {stage.category}</p>
            <p>난이도: {difficultyStars}</p>
            <p>크기: {stage.size[0]}×{stage.size[1]}</p>
          </div>
          {/* 미니 색상 팔레트 */}
          <div className="flex gap-1 mt-2">
            {usedColors.map((color) => (
              <div
                key={color}
                className="w-4 h-4 border border-gray-300 rounded"
                style={{ backgroundColor: getColorHex(color) }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
