"use client";

import { useMemo, useState } from "react";
import { formatDate, formatKrw } from "@/lib/dashboard";
import type { OrderItemDetail } from "@/lib/types";

interface Props {
  items: OrderItemDetail[];
}

const PAGE_SIZE = 50;

export function OrderItemTable({ items }: Props) {
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = useMemo(
    () => items.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE),
    [items, safePage]
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-700">
          주문 상품 상세
          <span className="ml-2 text-xs font-normal text-slate-500">
            ({items.length.toLocaleString()}개)
          </span>
        </h3>
        {totalPages > 1 && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="rounded border border-slate-200 px-2 py-1 disabled:opacity-40"
            >
              이전
            </button>
            <span>
              {safePage + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              className="rounded border border-slate-200 px-2 py-1 disabled:opacity-40"
            >
              다음
            </button>
          </div>
        )}
      </div>

      <div className="hidden md:block">
        <table className="min-w-full table-fixed text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="w-24 px-3 py-2 text-left">주문일</th>
              <th className="px-3 py-2 text-left">상품</th>
              <th className="w-28 px-3 py-2 text-left">카테고리</th>
              <th className="w-32 px-3 py-2 text-left">판매자</th>
              <th className="w-16 px-3 py-2 text-right">수량</th>
              <th className="w-28 px-3 py-2 text-right">상품금액</th>
              <th className="w-28 px-3 py-2 text-right">실결제</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageItems.map((it) => (
              <tr key={`${it.order_id}-${it.item_id}`} className="hover:bg-slate-50">
                <td className="px-3 py-2 text-slate-600">
                  {formatDate(it.order_date ?? it.order_datetime)}
                </td>
                <td className="px-3 py-2">
                  <div className="text-slate-900">{it.product_name}</div>
                  {it.product_option && (
                    <div className="mt-0.5 text-xs text-slate-500">
                      {it.product_option}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-slate-600">
                  <div>{it.category_major}</div>
                  {it.category_minor && (
                    <div className="text-xs text-slate-400">
                      {it.category_minor}
                    </div>
                  )}
                </td>
                <td className="truncate px-3 py-2 text-slate-600">
                  {it.seller ?? "-"}
                </td>
                <td className="px-3 py-2 text-right text-slate-700">
                  {it.quantity ?? "-"}
                </td>
                <td className="px-3 py-2 text-right font-medium text-slate-900">
                  {formatKrw(it.purchase_amount_krw)}
                </td>
                <td className="px-3 py-2 text-right text-slate-700">
                  {it.item_index === 1
                    ? formatKrw(it.paid_amount_krw)
                    : "-"}
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-sm text-slate-400">
                  조건에 맞는 결과가 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-slate-100 md:hidden">
        {pageItems.map((it) => (
          <li key={`${it.order_id}-${it.item_id}`} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm text-slate-900">{it.product_name}</div>
                {it.product_option && (
                  <div className="mt-0.5 text-xs text-slate-500">
                    {it.product_option}
                  </div>
                )}
                <div className="mt-1 text-xs text-slate-500">
                  {formatDate(it.order_date ?? it.order_datetime)} ·{" "}
                  {it.category_major} · {it.seller ?? "-"}
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="text-sm font-semibold text-slate-900">
                  {formatKrw(it.purchase_amount_krw)}
                </div>
                <div className="text-xs text-slate-500">
                  수량 {it.quantity ?? "-"}
                </div>
              </div>
            </div>
          </li>
        ))}
        {pageItems.length === 0 && (
          <li className="py-8 text-center text-sm text-slate-400">
            조건에 맞는 결과가 없습니다
          </li>
        )}
      </ul>
    </div>
  );
}
