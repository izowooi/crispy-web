import { describe, expect, it } from "vitest";
import {
  aggregateCategorySpend,
  aggregateMonthlySpend,
  applyFilters,
  dedupePaidByOrder,
  resolvePeriodRange,
  summarize,
} from "./dashboard";
import type { DashboardFilters, OrderItemDetail } from "./types";

const baseFilters: DashboardFilters = {
  period: "all",
  startMonth: null,
  endMonth: null,
  categories: [],
  search: "",
};

function makeItem(overrides: Partial<OrderItemDetail>): OrderItemDetail {
  return {
    order_id: overrides.order_id ?? 1,
    order_key: overrides.order_key ?? "k",
    order_no: overrides.order_no ?? null,
    order_datetime: overrides.order_datetime ?? "2026-03-15T10:00:00Z",
    order_date: overrides.order_date ?? "2026-03-15",
    paid_amount_krw: overrides.paid_amount_krw ?? 10000,
    payment_method: overrides.payment_method ?? null,
    item_id: overrides.item_id ?? 1,
    item_index: overrides.item_index ?? 1,
    product_name: overrides.product_name ?? "샘플 상품",
    product_option: overrides.product_option ?? null,
    unit_price_krw: overrides.unit_price_krw ?? 5000,
    quantity: overrides.quantity ?? 1,
    purchase_amount_krw: overrides.purchase_amount_krw ?? 5000,
    seller: overrides.seller ?? "샘플 판매자",
    category_major: overrides.category_major ?? "기타",
    category_minor: overrides.category_minor ?? null,
    category_confidence: overrides.category_confidence ?? null,
    subject: overrides.subject ?? null,
    source_path: overrides.source_path ?? null,
    message_id: overrides.message_id ?? null,
    raw_sha256: overrides.raw_sha256 ?? null,
  };
}

describe("dedupePaidByOrder", () => {
  it("같은 order_id가 여러 상품 행에 있어도 paid_amount_krw는 한 번만 합산된다", () => {
    const items = [
      makeItem({ order_id: 100, item_id: 1, paid_amount_krw: 25000 }),
      makeItem({ order_id: 100, item_id: 2, paid_amount_krw: 25000 }),
      makeItem({ order_id: 200, item_id: 3, paid_amount_krw: 8000 }),
    ];
    const r = dedupePaidByOrder(items);
    expect(r.totalPaid).toBe(33000);
    expect(r.orderCount).toBe(2);
  });
});

describe("resolvePeriodRange", () => {
  const now = new Date("2026-05-26T12:00:00Z");

  it("'last12' 프리셋은 최근 12개월 범위를 포함한다", () => {
    const r = resolvePeriodRange({ ...baseFilters, period: "last12" }, now);
    expect(r.start).not.toBeNull();
    expect(r.end).not.toBeNull();
    const startMonth = r.start!.getUTCFullYear() * 12 + r.start!.getUTCMonth();
    const endMonth = now.getUTCFullYear() * 12 + now.getUTCMonth();
    expect(endMonth - startMonth).toBe(11);
  });

  it("'ytd'는 해당 연도의 1월 1일부터 시작한다", () => {
    const r = resolvePeriodRange({ ...baseFilters, period: "ytd" }, now);
    expect(r.start?.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  it("'all'은 범위 없음을 반환한다", () => {
    const r = resolvePeriodRange({ ...baseFilters, period: "all" }, now);
    expect(r.start).toBeNull();
    expect(r.end).toBeNull();
  });

  it("'custom' 범위는 startMonth/endMonth 경계 월을 포함한다", () => {
    const r = resolvePeriodRange(
      {
        ...baseFilters,
        period: "custom",
        startMonth: "2026-02",
        endMonth: "2026-04",
      },
      now
    );
    expect(r.start?.toISOString()).toBe("2026-02-01T00:00:00.000Z");
    expect(r.end?.toISOString()).toBe("2026-04-30T23:59:59.999Z");
  });
});

describe("applyFilters", () => {
  const now = new Date("2026-05-26T12:00:00Z");
  const items = [
    makeItem({
      order_id: 1,
      item_id: 1,
      order_datetime: "2026-05-10T00:00:00Z",
      product_name: "신선 사과",
      category_major: "식품",
      seller: "쿠팡(주)",
    }),
    makeItem({
      order_id: 2,
      item_id: 2,
      order_datetime: "2025-12-01T00:00:00Z",
      product_name: "겨울 자켓",
      category_major: "패션",
      seller: "패션샵",
    }),
    makeItem({
      order_id: 3,
      item_id: 3,
      order_datetime: "2024-01-15T00:00:00Z",
      product_name: "옛날 책",
      category_major: "도서/문구",
      seller: "북스토어",
    }),
  ];

  it("최근 12개월 필터가 기대한 월 범위만 포함한다", () => {
    const r = applyFilters(
      items,
      { ...baseFilters, period: "last12" },
      now
    );
    expect(r.map((it) => it.order_id).sort()).toEqual([1, 2]);
  });

  it("올해 필터가 해당 연도의 데이터만 포함한다", () => {
    const r = applyFilters(items, { ...baseFilters, period: "ytd" }, now);
    expect(r.map((it) => it.order_id)).toEqual([1]);
  });

  it("전체 필터가 모든 데이터를 포함한다", () => {
    const r = applyFilters(items, { ...baseFilters, period: "all" }, now);
    expect(r).toHaveLength(3);
  });

  it("시작 월 / 끝 월 필터가 경계 월을 포함한다", () => {
    const r = applyFilters(
      items,
      {
        ...baseFilters,
        period: "custom",
        startMonth: "2025-12",
        endMonth: "2026-05",
      },
      now
    );
    expect(r.map((it) => it.order_id).sort()).toEqual([1, 2]);
  });

  it("대분류 필터가 선택한 카테고리만 남긴다", () => {
    const r = applyFilters(items, {
      ...baseFilters,
      categories: ["식품", "패션"],
    });
    expect(r.map((it) => it.category_major).sort()).toEqual(["식품", "패션"]);
  });

  it("검색어 필터가 상품명에 적용된다", () => {
    const r = applyFilters(items, { ...baseFilters, search: "자켓" });
    expect(r.map((it) => it.order_id)).toEqual([2]);
  });

  it("검색어 필터가 판매자에도 적용된다", () => {
    const r = applyFilters(items, { ...baseFilters, search: "북스토어" });
    expect(r.map((it) => it.order_id)).toEqual([3]);
  });

  it("검색어 필터가 옵션에도 적용된다", () => {
    const items2 = [
      makeItem({ order_id: 10, product_option: "베이지, 4개, 대형" }),
      makeItem({ order_id: 11, product_option: "블랙, 1개" }),
    ];
    const r = applyFilters(items2, { ...baseFilters, search: "베이지" });
    expect(r.map((it) => it.order_id)).toEqual([10]);
  });
});

describe("aggregateCategorySpend", () => {
  it("카테고리 집계는 purchase_amount_krw 기준으로 계산된다", () => {
    const items = [
      makeItem({
        order_id: 1,
        item_id: 1,
        category_major: "식품",
        purchase_amount_krw: 5000,
      }),
      makeItem({
        order_id: 1,
        item_id: 2,
        category_major: "식품",
        purchase_amount_krw: 7000,
      }),
      makeItem({
        order_id: 2,
        item_id: 3,
        category_major: "패션",
        purchase_amount_krw: 30000,
      }),
    ];
    const r = aggregateCategorySpend(items);
    const food = r.find((c) => c.category === "식품");
    const fashion = r.find((c) => c.category === "패션");
    expect(food?.amount).toBe(12000);
    expect(food?.itemCount).toBe(2);
    expect(fashion?.amount).toBe(30000);
    expect(r[0].category).toBe("패션");
  });
});

describe("aggregateMonthlySpend", () => {
  it("월별 실결제는 주문 단위로 한 번만 합산된다", () => {
    const items = [
      makeItem({
        order_id: 1,
        item_id: 1,
        order_datetime: "2026-03-10T00:00:00Z",
        paid_amount_krw: 20000,
      }),
      makeItem({
        order_id: 1,
        item_id: 2,
        order_datetime: "2026-03-10T00:00:00Z",
        paid_amount_krw: 20000,
      }),
      makeItem({
        order_id: 2,
        item_id: 3,
        order_datetime: "2026-03-15T00:00:00Z",
        paid_amount_krw: 15000,
      }),
    ];
    const r = aggregateMonthlySpend(items);
    expect(r).toHaveLength(1);
    expect(r[0].month).toBe("2026-03");
    expect(r[0].paidAmount).toBe(35000);
    expect(r[0].orderCount).toBe(2);
  });
});

describe("summarize", () => {
  it("KPI를 비어 있지 않게 채운다", () => {
    const items = [
      makeItem({
        order_id: 1,
        item_id: 1,
        order_datetime: "2026-05-01T00:00:00Z",
        paid_amount_krw: 10000,
        purchase_amount_krw: 5000,
        category_major: "식품",
      }),
      makeItem({
        order_id: 1,
        item_id: 2,
        order_datetime: "2026-05-01T00:00:00Z",
        paid_amount_krw: 10000,
        purchase_amount_krw: 5000,
        category_major: "식품",
      }),
      makeItem({
        order_id: 2,
        item_id: 3,
        order_datetime: "2026-04-20T00:00:00Z",
        paid_amount_krw: 30000,
        purchase_amount_krw: 30000,
        category_major: "패션",
      }),
    ];
    const s = summarize(items, baseFilters, new Date("2026-05-26T00:00:00Z"));
    expect(s.totalPaid).toBe(40000);
    expect(s.orderCount).toBe(2);
    expect(s.itemCount).toBe(3);
    expect(s.averageOrder).toBe(20000);
    expect(s.topMonth?.month).toBe("2026-04");
    expect(s.monthlySpend).toHaveLength(2);
  });
});
