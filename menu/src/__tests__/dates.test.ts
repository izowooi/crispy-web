import { describe, expect, it } from "vitest";
import { addDays, formatKoreanDate, isIsoDate, nearestDate, photoStillStored, todayKST, weekdayKo } from "@/lib/dates";

describe("todayKST", () => {
  it("UTC 저녁은 한국 기준 다음 날이다", () => {
    expect(todayKST(new Date("2026-10-12T15:30:00Z"))).toBe("2026-10-13");
    expect(todayKST(new Date("2026-10-12T14:59:59Z"))).toBe("2026-10-12");
  });

  it("월말 경계도 한국 시간으로 넘어간다", () => {
    expect(todayKST(new Date("2026-10-31T16:00:00Z"))).toBe("2026-11-01");
  });
});

describe("calendar helpers", () => {
  it("2026-10-01은 목요일, 10-13은 화요일", () => {
    expect(weekdayKo("2026-10-01")).toBe("목");
    expect(formatKoreanDate("2026-10-13")).toBe("10월 13일 (화)");
  });

  it("addDays는 월·연 경계를 넘는다", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("존재하지 않는 날짜를 거른다", () => {
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-10-1")).toBe(false);
    expect(isIsoDate("2026-10-13")).toBe(true);
  });

  it("nearestDate는 양방향으로 가장 가까운 식단일을 찾는다", () => {
    const dates = ["2026-10-08", "2026-10-12", "2026-10-13"];
    expect(nearestDate(dates, "2026-10-10", 1)).toBe("2026-10-12");
    expect(nearestDate(dates, "2026-10-10", -1)).toBe("2026-10-08");
    expect(nearestDate(dates, "2026-10-13", 1)).toBeNull();
  });
});

describe("photoStillStored", () => {
  const key = "daycares/abcd2345/2026-10-13-1a2b3c4d.jpg";

  it("업로드 후 179일째부터 원본 링크를 숨긴다(R2는 180일에 삭제)", () => {
    expect(photoStillStored(key, "2026-10-13")).toBe(true);
    expect(photoStillStored(key, addDays("2026-10-13", 178))).toBe(true);
    expect(photoStillStored(key, addDays("2026-10-13", 179))).toBe(false);
  });

  it("키가 없으면 숨기고, 날짜를 읽을 수 없는 키는 그대로 둔다", () => {
    expect(photoStillStored(null, "2026-10-13")).toBe(false);
    expect(photoStillStored("daycares/abcd2345/legacy.jpg", "2030-01-01")).toBe(true);
  });
});
