"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { fetchAllOrderItemDetails } from "@/lib/supabase";
import {
  summarize,
  uniqueCategories,
} from "@/lib/dashboard";
import type { DashboardFilters, OrderItemDetail } from "@/lib/types";
import { KpiCards } from "./KpiCards";
import { FilterBar } from "./FilterBar";
import {
  CategoryShareChart,
  MonthlyCategoryStackChart,
  MonthlyTrendChart,
} from "./Charts";
import { TopRankings } from "./TopRankings";
import { OrderItemTable } from "./OrderItemTable";

const DEFAULT_FILTERS: DashboardFilters = {
  period: "last12",
  startMonth: null,
  endMonth: null,
  categories: [],
  search: "",
};

export function Dashboard() {
  const [items, setItems] = useState<OrderItemDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllOrderItemDetails();
      setItems(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "알 수 없는 오류";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const allCategories = useMemo(() => uniqueCategories(items), [items]);

  const stackCategories = useMemo(() => {
    const summaryAll = summarize(items, { ...DEFAULT_FILTERS, period: "all" });
    return summaryAll.categorySpend.slice(0, 10).map((c) => c.category);
  }, [items]);

  const summary = useMemo(
    () => summarize(items, filters),
    [items, filters]
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">데이터 불러오는 중…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto mt-12 max-w-xl rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-semibold">데이터를 불러오지 못했습니다</div>
            <div className="mt-1 text-sm">{error}</div>
            <button
              onClick={() => void loadData()}
              className="mt-3 inline-flex items-center gap-1 rounded-md border border-rose-300 bg-white px-3 py-1.5 text-sm hover:bg-rose-100"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <KpiCards summary={summary} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <FilterBar
          filters={filters}
          allCategories={allCategories}
          onChange={setFilters}
        />
        <div className="space-y-4">
          <MonthlyTrendChart data={summary.monthlySpend} />
          <MonthlyCategoryStackChart
            data={summary.monthlyCategoryStack}
            categories={stackCategories}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CategoryShareChart data={summary.categorySpend} />
        <div className="space-y-4">
          <TopRankings
            topProducts={summary.topProducts}
            categorySpend={summary.categorySpend}
          />
        </div>
      </div>

      <OrderItemTable items={summary.filteredItems} />
    </div>
  );
}
