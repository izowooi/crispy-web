"use client";

import { Search, X } from "lucide-react";
import type { DashboardFilters, PeriodPreset } from "@/lib/types";

interface Props {
  filters: DashboardFilters;
  allCategories: string[];
  onChange: (next: DashboardFilters) => void;
}

const PERIOD_OPTIONS: Array<{ value: PeriodPreset; label: string }> = [
  { value: "last3", label: "최근 3개월" },
  { value: "last6", label: "최근 6개월" },
  { value: "last12", label: "최근 12개월" },
  { value: "ytd", label: "올해" },
  { value: "all", label: "전체" },
  { value: "custom", label: "직접 선택" },
];

export function FilterBar({ filters, allCategories, onChange }: Props) {
  const toggleCategory = (cat: string) => {
    const next = filters.categories.includes(cat)
      ? filters.categories.filter((c) => c !== cat)
      : [...filters.categories, cat];
    onChange({ ...filters, categories: next });
  };

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <div className="mb-2 text-xs font-semibold text-slate-500">기간</div>
        <div className="flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((opt) => {
            const active = filters.period === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() =>
                  onChange({
                    ...filters,
                    period: opt.value,
                  })
                }
                className={`rounded-full border px-3 py-1 text-sm transition ${
                  active
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {filters.period === "custom" && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <label className="flex items-center gap-1 text-slate-600">
              시작
              <input
                type="month"
                value={filters.startMonth ?? ""}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    startMonth: e.target.value || null,
                  })
                }
                className="rounded-md border border-slate-200 px-2 py-1"
              />
            </label>
            <label className="flex items-center gap-1 text-slate-600">
              끝
              <input
                type="month"
                value={filters.endMonth ?? ""}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    endMonth: e.target.value || null,
                  })
                }
                className="rounded-md border border-slate-200 px-2 py-1"
              />
            </label>
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-500">카테고리</div>
          {filters.categories.length > 0 && (
            <button
              onClick={() => onChange({ ...filters, categories: [] })}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              전체 해제
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {allCategories.map((cat) => {
            const active = filters.categories.includes(cat);
            return (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`rounded-full border px-3 py-1 text-sm transition ${
                  active
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                {cat}
              </button>
            );
          })}
          {filters.categories.length === 0 && (
            <span className="text-xs text-slate-400">선택하지 않으면 전체</span>
          )}
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs font-semibold text-slate-500">검색</div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filters.search}
            placeholder="상품명, 옵션, 판매자"
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm outline-none focus:border-indigo-500"
          />
          {filters.search && (
            <button
              onClick={() => onChange({ ...filters, search: "" })}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
              aria-label="검색 지우기"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
