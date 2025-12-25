'use client';

import { useState, useMemo } from 'react';
import { useClips } from '@/hooks/useClips';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  filterByMonthDay,
  filterByYear,
  selectRandomPerMonth,
  getUniqueYears,
  getDateRange,
} from '@/lib/clips/filter';

type MemoryMode = 'date' | 'timeline' | 'year';

export default function MemoriesPage() {
  const { clips, isLoading } = useClips();
  const router = useRouter();

  // Mode selection
  const [mode, setMode] = useState<MemoryMode>('date');

  // Mode 1: Specific date (month/day)
  const [selectedMonth, setSelectedMonth] = useState(12);
  const [selectedDay, setSelectedDay] = useState(25);

  // Mode 2: Monthly timeline
  const dateRange = useMemo(() => getDateRange(clips), [clips]);
  const [startYearMonth, setStartYearMonth] = useState('');
  const [endYearMonth, setEndYearMonth] = useState('');

  // Mode 3: Specific year
  const uniqueYears = useMemo(() => getUniqueYears(clips), [clips]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // Set default values when data is loaded
  useMemo(() => {
    if (dateRange && !startYearMonth) {
      const start = dateRange.minDate;
      setStartYearMonth(`${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`);
    }
    if (dateRange && !endYearMonth) {
      const end = dateRange.maxDate;
      setEndYearMonth(`${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}`);
    }
    if (uniqueYears.length > 0 && selectedYear === null) {
      setSelectedYear(uniqueYears[0]);
    }
  }, [dateRange, uniqueYears, startYearMonth, endYearMonth, selectedYear]);

  // Filtered clips based on mode
  const filteredClips = useMemo(() => {
    switch (mode) {
      case 'date':
        return filterByMonthDay(clips, selectedMonth, selectedDay);
      case 'year':
        if (selectedYear === null) return [];
        return filterByYear(clips, selectedYear);
      case 'timeline':
        if (!startYearMonth || !endYearMonth) return [];
        const [startYear, startMonth] = startYearMonth.split('-').map(Number);
        const [endYear, endMonth] = endYearMonth.split('-').map(Number);
        const startDate = new Date(startYear, startMonth - 1, 1);
        const endDate = new Date(endYear, endMonth, 0); // Last day of end month
        return selectRandomPerMonth(clips, startDate, endDate);
      default:
        return [];
    }
  }, [mode, clips, selectedMonth, selectedDay, selectedYear, startYearMonth, endYearMonth]);

  const handlePlay = () => {
    if (filteredClips.length === 0) return;

    // Store filtered clip IDs in sessionStorage and navigate to play page
    const clipIds = filteredClips.map((c) => c.id);
    sessionStorage.setItem('memoryClipIds', JSON.stringify(clipIds));
    router.push('/memories/play');
  };

  // Month options
  const months = [
    { value: 1, label: '1월' },
    { value: 2, label: '2월' },
    { value: 3, label: '3월' },
    { value: 4, label: '4월' },
    { value: 5, label: '5월' },
    { value: 6, label: '6월' },
    { value: 7, label: '7월' },
    { value: 8, label: '8월' },
    { value: 9, label: '9월' },
    { value: 10, label: '10월' },
    { value: 11, label: '11월' },
    { value: 12, label: '12월' },
  ];

  // Day options (1-31)
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card-bg border-b border-card-border">
        <div className="max-w-screen-xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="text-foreground/60 hover:text-foreground transition-colors"
          >
            ← 뒤로
          </Link>
          <h1 className="text-xl font-bold text-foreground">추억 모음</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Mode Selection */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-foreground mb-3">모드 선택</h2>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setMode('date')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                mode === 'date'
                  ? 'bg-primary text-white'
                  : 'bg-card-bg border border-card-border text-foreground hover:border-primary/50'
              }`}
            >
              특정 날짜
            </button>
            <button
              onClick={() => setMode('timeline')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                mode === 'timeline'
                  ? 'bg-primary text-white'
                  : 'bg-card-bg border border-card-border text-foreground hover:border-primary/50'
              }`}
            >
              월별 타임라인
            </button>
            <button
              onClick={() => setMode('year')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                mode === 'year'
                  ? 'bg-primary text-white'
                  : 'bg-card-bg border border-card-border text-foreground hover:border-primary/50'
              }`}
            >
              연도별
            </button>
          </div>
        </div>

        {/* Mode Settings */}
        <div className="bg-card-bg border border-card-border rounded-2xl p-6 mb-8">
          {/* Mode 1: Specific Date */}
          {mode === 'date' && (
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">
                특정 날짜 모음
              </h3>
              <p className="text-sm text-foreground/60 mb-4">
                매년 같은 날짜에 촬영된 영상들을 모아볼 수 있습니다.
                <br />
                예: 크리스마스(12/25), 생일, 기념일 등
              </p>
              <div className="flex gap-4 items-center">
                <div>
                  <label className="block text-sm text-foreground/60 mb-1">월</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="px-4 py-2 bg-background border border-card-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                  >
                    {months.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-foreground/60 mb-1">일</label>
                  <select
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(Number(e.target.value))}
                    className="px-4 py-2 bg-background border border-card-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                  >
                    {days.map((d) => (
                      <option key={d} value={d}>
                        {d}일
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Mode 2: Monthly Timeline */}
          {mode === 'timeline' && (
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">
                월별 랜덤 타임라인
              </h3>
              <p className="text-sm text-foreground/60 mb-4">
                지정한 기간 내 매월 1개의 영상을 랜덤으로 선택하여 타임라인을 만듭니다.
              </p>
              <div className="flex gap-4 items-center flex-wrap">
                <div>
                  <label className="block text-sm text-foreground/60 mb-1">시작</label>
                  <input
                    type="month"
                    value={startYearMonth}
                    onChange={(e) => setStartYearMonth(e.target.value)}
                    className="px-4 py-2 bg-background border border-card-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <span className="text-foreground/40 self-end pb-2">~</span>
                <div>
                  <label className="block text-sm text-foreground/60 mb-1">종료</label>
                  <input
                    type="month"
                    value={endYearMonth}
                    onChange={(e) => setEndYearMonth(e.target.value)}
                    className="px-4 py-2 bg-background border border-card-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Mode 3: Specific Year */}
          {mode === 'year' && (
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">
                연도별 모음
              </h3>
              <p className="text-sm text-foreground/60 mb-4">
                특정 연도에 촬영된 모든 영상을 모아볼 수 있습니다.
              </p>
              <div>
                <label className="block text-sm text-foreground/60 mb-1">연도 선택</label>
                <div className="flex gap-2 flex-wrap">
                  {uniqueYears.length > 0 ? (
                    uniqueYears.map((year) => (
                      <button
                        key={year}
                        onClick={() => setSelectedYear(year)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          selectedYear === year
                            ? 'bg-primary text-white'
                            : 'bg-background border border-card-border text-foreground hover:border-primary/50'
                        }`}
                      >
                        {year}년
                      </button>
                    ))
                  ) : (
                    <p className="text-foreground/40 text-sm">
                      촬영일이 설정된 클립이 없습니다.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Result Preview */}
        <div className="bg-card-bg border border-card-border rounded-2xl p-6 mb-8">
          <h3 className="text-sm font-medium text-foreground mb-3">결과 미리보기</h3>
          {filteredClips.length > 0 ? (
            <div>
              <p className="text-foreground mb-4">
                <span className="text-2xl font-bold text-primary">{filteredClips.length}</span>
                <span className="text-foreground/60">개의 영상을 찾았습니다</span>
              </p>
              <div className="grid grid-cols-4 gap-2">
                {filteredClips.slice(0, 8).map((clip) => (
                  <div
                    key={clip.id}
                    className="aspect-[9/16] bg-card-border rounded-lg overflow-hidden"
                  >
                    {clip.thumbnailKey ? (
                      <img
                        src={`${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${clip.thumbnailKey}`}
                        alt={clip.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        {clip.emoji}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {filteredClips.length > 8 && (
                <p className="text-sm text-foreground/40 mt-2">
                  외 {filteredClips.length - 8}개 더...
                </p>
              )}
            </div>
          ) : (
            <p className="text-foreground/40">
              조건에 맞는 영상이 없습니다.
            </p>
          )}
        </div>

        {/* Play Button */}
        <button
          onClick={handlePlay}
          disabled={filteredClips.length === 0}
          className="w-full py-4 bg-primary text-white rounded-xl font-bold text-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          재생하기
        </button>
      </main>
    </div>
  );
}
