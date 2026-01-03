'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { Stage } from '@/types/nonogram';
import { PuzzlePage } from '@/components/PuzzlePage';

function PrintContent() {
  const searchParams = useSearchParams();
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);

  const idsParam = searchParams.get('ids') || '';
  const type = searchParams.get('type') || 'puzzle';

  const selectedIds = useMemo(
    () => (idsParam ? idsParam.split(',') : []),
    [idsParam]
  );

  useEffect(() => {
    fetch('/stages.json')
      .then((res) => res.json())
      .then((data: Stage[]) => {
        const filtered = data.filter((s) => selectedIds.includes(s.id));
        // 선택 순서대로 정렬
        const sorted = selectedIds
          .map((id) => filtered.find((s) => s.id === id))
          .filter((s): s is Stage => s !== undefined);
        setStages(sorted);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load stages:', err);
        setLoading(false);
      });
  }, [selectedIds]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">로딩 중...</p>
      </div>
    );
  }

  if (stages.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-lg">선택된 문제가 없습니다.</p>
        <Link href="/" className="text-blue-500 hover:underline">
          돌아가기
        </Link>
      </div>
    );
  }

  // 페이지 생성
  const pages: { stage: Stage; showAnswer: boolean }[] = [];

  stages.forEach((stage) => {
    if (type === 'puzzle' || type === 'both') {
      pages.push({ stage, showAnswer: false });
    }
    if (type === 'answer' || type === 'both') {
      pages.push({ stage, showAnswer: true });
    }
  });

  return (
    <div className="min-h-screen">
      {/* 컨트롤 바 (인쇄 시 숨김) */}
      <div className="no-print fixed top-0 left-0 right-0 bg-white shadow-md p-4 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-blue-500 hover:underline">
              ← 돌아가기
            </Link>
            <span className="text-gray-600">
              {stages.length}개 문제 /{' '}
              {type === 'puzzle'
                ? '문제지'
                : type === 'answer'
                ? '답안지'
                : '문제+답안'}
            </span>
          </div>
          <button
            onClick={handlePrint}
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-medium"
          >
            인쇄하기
          </button>
        </div>
      </div>

      {/* 인쇄용 페이지들 */}
      <div className="pt-20 print:pt-0">
        {pages.map((page, index) => (
          <div
            key={`${page.stage.id}-${page.showAnswer ? 'answer' : 'puzzle'}`}
            className="puzzle-page min-h-screen flex items-center justify-center print:min-h-0"
          >
            <PuzzlePage
              stage={page.stage}
              showAnswer={page.showAnswer}
              cellSize={24}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PrintPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-lg">로딩 중...</p>
        </div>
      }
    >
      <PrintContent />
    </Suspense>
  );
}
