import { describe, expect, it } from "vitest";
import type { DayMenu, MonthSheet } from "@/lib/schema";
import { itemsToText, normalizeSheet, textToItems } from "@/lib/sheet";

function day(partial: Partial<DayMenu>): DayMenu {
  return {
    date: "2026-10-01",
    weekday: "목",
    closed: false,
    closedReason: null,
    event: null,
    morningSnack: [],
    lunch: [{ name: "기장밥", allergens: [] }],
    afternoonSnack: [],
    kcal: 445,
    protein: 16,
    origin: null,
    note: null,
    ...partial,
  };
}

function sheet(days: DayMenu[]): MonthSheet {
  return { year: 2026, month: 10, title: " 2026년 10월  식단 ", notes: [""], allergenLegend: [], footer: [], days };
}

describe("normalizeSheet", () => {
  it("다른 달·잘못된 날짜를 제외하고 날짜순으로 정렬한다", () => {
    const { sheet: result, warnings } = normalizeSheet(
      sheet([day({ date: "2026-10-13", weekday: "화" }), day({ date: "2026-11-02" }), day({ date: "2026-10-32" }), day({})]),
    );
    expect(result.days.map((d) => d.date)).toEqual(["2026-10-01", "2026-10-13"]);
    expect(warnings).toHaveLength(2);
    expect(result.title).toBe("2026년 10월 식단");
    expect(result.notes).toEqual([]);
  });

  it("사진 요일과 달력 요일이 다르면 경고하고 실제 요일로 고친다", () => {
    const { sheet: result, warnings } = normalizeSheet(sheet([day({ date: "2026-10-07", weekday: "목" })]));
    expect(result.days[0].weekday).toBe("수");
    expect(warnings[0]).toContain("7일");
  });

  it("사용자가 확정한 연·월을 우선한다", () => {
    const { sheet: result } = normalizeSheet({ ...sheet([day({ date: "2026-09-01", weekday: "" })]), month: 10 }, { year: 2026, month: 9 });
    expect(result.month).toBe(9);
    expect(result.days).toHaveLength(1);
  });

  it("알레르기 번호를 정리하고 빈 항목·0 열량을 지운다", () => {
    const { sheet: result } = normalizeSheet(
      sheet([day({ lunch: [{ name: " 모듬버섯국 ", allergens: [6, 5, 5, 0] }, { name: " ", allergens: [] }], kcal: 0 })]),
    );
    expect(result.days[0].lunch).toEqual([{ name: "모듬버섯국", allergens: [5, 6] }]);
    expect(result.days[0].kcal).toBeNull();
  });

  it("휴원일이 아닌데 메뉴가 비면 경고한다", () => {
    const { warnings } = normalizeSheet(
      sheet([day({ lunch: [] }), day({ date: "2026-10-09", weekday: "금", lunch: [], closed: true, closedReason: "한글날" })]),
    );
    expect(warnings).toEqual(["1일: 메뉴가 비어 있어요."]);
  });
});

describe("editor item text", () => {
  it("항목과 알레르기 번호를 왕복 변환한다", () => {
    const items = [
      { name: "백김치(백깍두기)", allergens: [9] },
      { name: "새콤무생채", allergens: [] },
    ];
    expect(itemsToText(items)).toBe("백김치(백깍두기) [9]\n새콤무생채");
    expect(textToItems(itemsToText(items))).toEqual(items);
  });

  it("빈 줄을 무시하고 괄호 없는 숫자는 이름으로 둔다", () => {
    expect(textToItems("\n우유 [2]\n\n신선과일(토마토12)\n")).toEqual([
      { name: "우유", allergens: [2] },
      { name: "신선과일(토마토12)", allergens: [] },
    ]);
  });
});
