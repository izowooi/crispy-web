export interface OrderItemDetail {
  order_id: number;
  order_key: string;
  order_no: string | null;
  order_datetime: string | null;
  order_date: string | null;
  paid_amount_krw: number | null;
  payment_method: string | null;
  item_id: number;
  item_index: number;
  product_name: string;
  product_option: string | null;
  unit_price_krw: number | null;
  quantity: number | null;
  purchase_amount_krw: number | null;
  seller: string | null;
  category_major: string;
  category_minor: string | null;
  category_confidence: string | number | null;
  subject: string | null;
  source_path: string | null;
  message_id: string | null;
  raw_sha256: string | null;
}

export type PeriodPreset =
  | "last3"
  | "last6"
  | "last12"
  | "ytd"
  | "all"
  | "custom";

export interface DashboardFilters {
  period: PeriodPreset;
  startMonth: string | null;
  endMonth: string | null;
  categories: string[];
  search: string;
}

export interface MonthlySpend {
  month: string;
  paidAmount: number;
  orderCount: number;
}

export interface CategorySpend {
  category: string;
  amount: number;
  itemCount: number;
}

export interface MonthlyCategoryStack {
  month: string;
  totals: Record<string, number>;
}

export interface TopProduct {
  productName: string;
  amount: number;
  quantity: number;
  orderCount: number;
}

export interface DashboardSummary {
  totalPaid: number;
  orderCount: number;
  itemCount: number;
  averageOrder: number;
  topMonth: { month: string; amount: number } | null;
  monthlySpend: MonthlySpend[];
  categorySpend: CategorySpend[];
  monthlyCategoryStack: MonthlyCategoryStack[];
  topProducts: TopProduct[];
  filteredItems: OrderItemDetail[];
}
