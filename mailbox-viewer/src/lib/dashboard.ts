import type {
  DashboardFilters,
  DashboardSummary,
  OrderItemDetail,
  PeriodPreset,
} from "./types";

const MS_PER_DAY = 86_400_000;

export function toMonthKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  return `${year}-${month}`;
}

export function pickItemMonth(item: OrderItemDetail): string | null {
  return toMonthKey(item.order_datetime ?? item.order_date);
}

function shiftMonths(reference: Date, months: number): Date {
  const d = new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1)
  );
  d.setUTCMonth(d.getUTCMonth() - months);
  return d;
}

function endOfMonth(monthKey: string): Date {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(y, m, 1, 0, 0, 0) - 1);
}

function startOfMonth(monthKey: string): Date {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1));
}

export interface PeriodRange {
  start: Date | null;
  end: Date | null;
}

export function resolvePeriodRange(
  filters: DashboardFilters,
  now: Date = new Date()
): PeriodRange {
  const preset: PeriodPreset = filters.period;
  if (preset === "all") return { start: null, end: null };

  if (preset === "custom") {
    return {
      start: filters.startMonth ? startOfMonth(filters.startMonth) : null,
      end: filters.endMonth ? endOfMonth(filters.endMonth) : null,
    };
  }

  if (preset === "ytd") {
    const year = now.getUTCFullYear();
    return {
      start: new Date(Date.UTC(year, 0, 1)),
      end: new Date(Date.UTC(year + 1, 0, 1) - 1),
    };
  }

  const monthMap: Record<Exclude<PeriodPreset, "all" | "custom" | "ytd">, number> = {
    last3: 3,
    last6: 6,
    last12: 12,
  };
  const months = monthMap[preset];
  const start = shiftMonths(now, months - 1);
  return {
    start,
    end: new Date(now.getTime() + MS_PER_DAY),
  };
}

function withinRange(
  item: OrderItemDetail,
  range: PeriodRange
): boolean {
  if (!range.start && !range.end) return true;
  const ref = item.order_datetime ?? item.order_date;
  if (!ref) return false;
  const t = new Date(ref).getTime();
  if (Number.isNaN(t)) return false;
  if (range.start && t < range.start.getTime()) return false;
  if (range.end && t > range.end.getTime()) return false;
  return true;
}

function matchesCategory(
  item: OrderItemDetail,
  categories: string[]
): boolean {
  if (categories.length === 0) return true;
  return categories.includes(item.category_major);
}

function matchesSearch(item: OrderItemDetail, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    item.product_name,
    item.product_option,
    item.seller,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function applyFilters(
  items: OrderItemDetail[],
  filters: DashboardFilters,
  now: Date = new Date()
): OrderItemDetail[] {
  const range = resolvePeriodRange(filters, now);
  return items.filter(
    (it) =>
      withinRange(it, range) &&
      matchesCategory(it, filters.categories) &&
      matchesSearch(it, filters.search)
  );
}

export function dedupePaidByOrder(items: OrderItemDetail[]): {
  totalPaid: number;
  orderCount: number;
  perOrder: Map<number, number>;
} {
  const perOrder = new Map<number, number>();
  for (const it of items) {
    if (perOrder.has(it.order_id)) continue;
    if (typeof it.paid_amount_krw === "number") {
      perOrder.set(it.order_id, it.paid_amount_krw);
    } else {
      perOrder.set(it.order_id, 0);
    }
  }
  let totalPaid = 0;
  for (const v of perOrder.values()) totalPaid += v;
  return { totalPaid, orderCount: perOrder.size, perOrder };
}

export function aggregateMonthlySpend(items: OrderItemDetail[]) {
  const map = new Map<string, { paidAmount: number; orderIds: Set<number> }>();
  const paidOrders = new Set<number>();

  for (const it of items) {
    const month = pickItemMonth(it);
    if (!month) continue;
    let bucket = map.get(month);
    if (!bucket) {
      bucket = { paidAmount: 0, orderIds: new Set() };
      map.set(month, bucket);
    }
    bucket.orderIds.add(it.order_id);

    if (!paidOrders.has(it.order_id)) {
      paidOrders.add(it.order_id);
      bucket.paidAmount += it.paid_amount_krw ?? 0;
    }
  }

  return Array.from(map.entries())
    .map(([month, b]) => ({
      month,
      paidAmount: b.paidAmount,
      orderCount: b.orderIds.size,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export function aggregateCategorySpend(items: OrderItemDetail[]) {
  const map = new Map<string, { amount: number; itemCount: number }>();
  for (const it of items) {
    const cat = it.category_major || "기타";
    const amount = it.purchase_amount_krw ?? 0;
    let bucket = map.get(cat);
    if (!bucket) {
      bucket = { amount: 0, itemCount: 0 };
      map.set(cat, bucket);
    }
    bucket.amount += amount;
    bucket.itemCount += 1;
  }
  return Array.from(map.entries())
    .map(([category, b]) => ({
      category,
      amount: b.amount,
      itemCount: b.itemCount,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function aggregateMonthlyCategoryStack(items: OrderItemDetail[]) {
  const map = new Map<string, Record<string, number>>();
  for (const it of items) {
    const month = pickItemMonth(it);
    if (!month) continue;
    const cat = it.category_major || "기타";
    const amount = it.purchase_amount_krw ?? 0;
    let totals = map.get(month);
    if (!totals) {
      totals = {};
      map.set(month, totals);
    }
    totals[cat] = (totals[cat] ?? 0) + amount;
  }
  return Array.from(map.entries())
    .map(([month, totals]) => ({ month, totals }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export function topProducts(items: OrderItemDetail[], limit = 10) {
  const map = new Map<
    string,
    { amount: number; quantity: number; orderIds: Set<number> }
  >();
  for (const it of items) {
    const name = it.product_name || "(이름 없음)";
    let bucket = map.get(name);
    if (!bucket) {
      bucket = { amount: 0, quantity: 0, orderIds: new Set() };
      map.set(name, bucket);
    }
    bucket.amount += it.purchase_amount_krw ?? 0;
    bucket.quantity += it.quantity ?? 0;
    bucket.orderIds.add(it.order_id);
  }
  return Array.from(map.entries())
    .map(([productName, b]) => ({
      productName,
      amount: b.amount,
      quantity: b.quantity,
      orderCount: b.orderIds.size,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

export function uniqueCategories(items: OrderItemDetail[]): string[] {
  const set = new Set<string>();
  for (const it of items) {
    set.add(it.category_major || "기타");
  }
  return Array.from(set).sort();
}

export function summarize(
  items: OrderItemDetail[],
  filters: DashboardFilters,
  now: Date = new Date()
): DashboardSummary {
  const filtered = applyFilters(items, filters, now);
  const { totalPaid, orderCount } = dedupePaidByOrder(filtered);
  const monthly = aggregateMonthlySpend(filtered);
  const categorySpend = aggregateCategorySpend(filtered);
  const monthlyCategoryStack = aggregateMonthlyCategoryStack(filtered);
  const products = topProducts(filtered, 10);

  let topMonth: { month: string; amount: number } | null = null;
  for (const m of monthly) {
    if (!topMonth || m.paidAmount > topMonth.amount) {
      topMonth = { month: m.month, amount: m.paidAmount };
    }
  }

  return {
    totalPaid,
    orderCount,
    itemCount: filtered.length,
    averageOrder: orderCount > 0 ? Math.round(totalPaid / orderCount) : 0,
    topMonth,
    monthlySpend: monthly,
    categorySpend,
    monthlyCategoryStack,
    topProducts: products,
    filteredItems: filtered,
  };
}

export function formatKrw(value: number | null | undefined): string {
  if (value == null) return "-";
  return new Intl.NumberFormat("ko-KR").format(value) + "원";
}

export function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-");
  return `${y}.${m}`;
}

export function formatDate(value: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}
