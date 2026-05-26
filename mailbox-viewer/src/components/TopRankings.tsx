"use client";

import { formatKrw } from "@/lib/dashboard";
import type { CategorySpend, TopProduct } from "@/lib/types";

interface Props {
  topProducts: TopProduct[];
  categorySpend: CategorySpend[];
}

export function TopRankings({ topProducts, categorySpend }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700">상위 상품</h3>
        <ol className="mt-3 space-y-2">
          {topProducts.map((p, idx) => (
            <li
              key={p.productName}
              className="flex items-start justify-between gap-3 rounded-md px-2 py-2 hover:bg-slate-50"
            >
              <div className="flex min-w-0 flex-1 items-start gap-2">
                <span className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 text-sm text-slate-800">
                    {p.productName}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {p.orderCount}건 주문 · {p.quantity}개
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0 text-sm font-semibold text-slate-900">
                {formatKrw(p.amount)}
              </div>
            </li>
          ))}
          {topProducts.length === 0 && (
            <li className="py-4 text-center text-sm text-slate-400">
              데이터 없음
            </li>
          )}
        </ol>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700">상위 카테고리</h3>
        <ol className="mt-3 space-y-2">
          {categorySpend.slice(0, 10).map((c, idx) => (
            <li
              key={c.category}
              className="flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-slate-50"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-semibold text-emerald-600">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <div className="text-sm text-slate-800">{c.category}</div>
                  <div className="text-xs text-slate-500">{c.itemCount}개 상품</div>
                </div>
              </div>
              <div className="flex-shrink-0 text-sm font-semibold text-slate-900">
                {formatKrw(c.amount)}
              </div>
            </li>
          ))}
          {categorySpend.length === 0 && (
            <li className="py-4 text-center text-sm text-slate-400">
              데이터 없음
            </li>
          )}
        </ol>
      </div>
    </div>
  );
}
