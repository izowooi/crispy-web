"use client";

import { ShoppingCart, Package, Wallet, TrendingUp, CalendarRange } from "lucide-react";
import { formatKrw, formatMonthLabel } from "@/lib/dashboard";
import type { DashboardSummary } from "@/lib/types";

interface Props {
  summary: DashboardSummary;
}

export function KpiCards({ summary }: Props) {
  const items: Array<{
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
    accent: string;
  }> = [
    {
      icon: Wallet,
      label: "실결제 합계",
      value: formatKrw(summary.totalPaid),
      accent: "text-indigo-600",
    },
    {
      icon: ShoppingCart,
      label: "주문 수",
      value: summary.orderCount.toLocaleString() + "건",
      accent: "text-emerald-600",
    },
    {
      icon: Package,
      label: "상품 수",
      value: summary.itemCount.toLocaleString() + "개",
      accent: "text-amber-600",
    },
    {
      icon: TrendingUp,
      label: "평균 주문액",
      value: formatKrw(summary.averageOrder),
      accent: "text-sky-600",
    },
    {
      icon: CalendarRange,
      label: "최대 지출 월",
      value: summary.topMonth
        ? `${formatMonthLabel(summary.topMonth.month)} · ${formatKrw(summary.topMonth.amount)}`
        : "-",
      accent: "text-rose-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <div
            key={it.label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${it.accent}`} />
              <span className="text-xs font-medium text-slate-500">
                {it.label}
              </span>
            </div>
            <div className="mt-2 text-lg font-semibold text-slate-900 sm:text-xl">
              {it.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
