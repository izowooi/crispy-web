"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatKrw, formatMonthLabel } from "@/lib/dashboard";
import type {
  CategorySpend,
  MonthlyCategoryStack,
  MonthlySpend,
} from "@/lib/types";

const CATEGORY_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#0ea5e9",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#84cc16",
  "#f97316",
  "#a855f7",
  "#06b6d4",
  "#22c55e",
  "#eab308",
  "#64748b",
];

function formatTickAmount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return value.toString();
}

export function MonthlyTrendChart({ data }: { data: MonthlySpend[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700">월별 실결제 추이</h3>
      <div className="mt-3 h-64 w-full">
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="month"
              tickFormatter={formatMonthLabel}
              fontSize={11}
              stroke="#64748b"
            />
            <YAxis
              tickFormatter={formatTickAmount}
              fontSize={11}
              stroke="#64748b"
            />
            <Tooltip
              formatter={(v: number) => formatKrw(v)}
              labelFormatter={(l: string) => formatMonthLabel(l)}
            />
            <Line
              type="monotone"
              dataKey="paidAmount"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="실결제"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function MonthlyCategoryStackChart({
  data,
  categories,
}: {
  data: MonthlyCategoryStack[];
  categories: string[];
}) {
  const rows = data.map((row) => {
    const r: Record<string, number | string> = { month: row.month };
    for (const c of categories) {
      r[c] = row.totals[c] ?? 0;
    }
    return r;
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700">
        월별 카테고리 누적 (상품금액)
      </h3>
      <div className="mt-3 h-72 w-full">
        <ResponsiveContainer>
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="month"
              tickFormatter={formatMonthLabel}
              fontSize={11}
              stroke="#64748b"
            />
            <YAxis
              tickFormatter={formatTickAmount}
              fontSize={11}
              stroke="#64748b"
            />
            <Tooltip
              formatter={(v: number) => formatKrw(v)}
              labelFormatter={(l: string) => formatMonthLabel(l)}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {categories.map((cat, idx) => (
              <Bar
                key={cat}
                dataKey={cat}
                stackId="cat"
                fill={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function CategoryShareChart({ data }: { data: CategorySpend[] }) {
  const top = data.slice(0, 12);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700">카테고리 점유</h3>
      <div className="mt-3 h-72 w-full">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={top}
              dataKey="amount"
              nameKey="category"
              cx="50%"
              cy="50%"
              outerRadius={90}
              label={(props) => {
                const { category, percent } = props as unknown as {
                  category: string;
                  percent: number;
                };
                return `${category} ${(percent * 100).toFixed(0)}%`;
              }}
              labelLine={false}
              fontSize={11}
            >
              {top.map((_, idx) => (
                <Cell
                  key={idx}
                  fill={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => formatKrw(v)} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
