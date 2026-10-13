import { isIsoDate, toYm, weekdayKo } from "./dates";
import type { DayMenu, MenuItem, MonthSheet } from "./schema";

function cleanText(value: string | null | undefined): string | null {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  return text ? text : null;
}

function cleanItems(items: MenuItem[]): MenuItem[] {
  return items
    .map((item) => ({
      name: (item.name ?? "").replace(/\s+/g, " ").trim(),
      allergens: [...new Set(item.allergens.filter((n) => Number.isInteger(n) && n >= 1 && n <= 99))].sort(
        (a, b) => a - b,
      ),
    }))
    .filter((item) => item.name);
}

function cleanNumber(value: number | null): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

export type NormalizeResult = { sheet: MonthSheet; warnings: string[] };

/**
 * AI가 읽은 결과는 그대로 믿지 않는다. 연·월 밖의 날짜를 버리고, 사진에 적힌 요일과
 * 실제 달력 요일이 다르면 경고로 남겨 사용자가 저장 전에 확인하게 한다.
 */
export function normalizeSheet(raw: MonthSheet, override?: { year: number; month: number }): NormalizeResult {
  const year = override?.year ?? raw.year;
  const month = override?.month ?? raw.month;
  const ym = toYm(year, month);
  const warnings: string[] = [];
  const byDate = new Map<string, DayMenu>();

  for (const day of raw.days) {
    const date = (day.date ?? "").trim();
    if (!isIsoDate(date) || !date.startsWith(`${ym}-`)) {
      warnings.push(`${date || "(날짜 없음)"}: ${month}월 날짜가 아니라 제외했어요.`);
      continue;
    }
    const actual = weekdayKo(date);
    const written = (day.weekday ?? "").trim().slice(0, 1);
    if (written && written !== actual) {
      warnings.push(`${Number(date.slice(8))}일: 사진에는 '${written}'요일로 읽혔지만 달력상 ${actual}요일이에요. 날짜를 확인해 주세요.`);
    }
    if (byDate.has(date)) warnings.push(`${Number(date.slice(8))}일이 두 번 읽혀 뒤쪽 내용으로 합쳤어요.`);
    byDate.set(date, {
      date,
      weekday: actual,
      closed: Boolean(day.closed),
      closedReason: cleanText(day.closedReason),
      event: cleanText(day.event),
      morningSnack: cleanItems(day.morningSnack ?? []),
      lunch: cleanItems(day.lunch ?? []),
      afternoonSnack: cleanItems(day.afternoonSnack ?? []),
      kcal: cleanNumber(day.kcal),
      protein: cleanNumber(day.protein),
      origin: cleanText(day.origin),
      note: cleanText(day.note),
    });
  }

  const days = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  for (const day of days) {
    const empty = !day.morningSnack.length && !day.lunch.length && !day.afternoonSnack.length;
    if (empty && !day.closed) warnings.push(`${Number(day.date.slice(8))}일: 메뉴가 비어 있어요.`);
  }

  return {
    sheet: {
      year,
      month,
      title: cleanText(raw.title) ?? `${year}년 ${month}월 식단`,
      notes: raw.notes.map((n) => cleanText(n)).filter((n): n is string => Boolean(n)),
      allergenLegend: raw.allergenLegend
        .filter((a) => Number.isInteger(a.number) && cleanText(a.name))
        .sort((a, b) => a.number - b.number),
      footer: raw.footer.map((n) => cleanText(n)).filter((n): n is string => Boolean(n)),
      days,
    },
    warnings,
  };
}

/** 편집기에서는 항목을 한 줄씩 "이름 [5,6]" 형태로 다룬다. */
export function itemsToText(items: MenuItem[]): string {
  return items.map((i) => (i.allergens.length ? `${i.name} [${i.allergens.join(",")}]` : i.name)).join("\n");
}

export function textToItems(text: string): MenuItem[] {
  return cleanItems(
    text.split("\n").map((line) => {
      const m = /^(.*?)\s*\[([\d,\s]*)\]\s*$/.exec(line);
      if (!m) return { name: line, allergens: [] };
      return {
        name: m[1],
        allergens: m[2]
          .split(",")
          .map((n) => Number(n.trim()))
          .filter((n) => n > 0),
      };
    }),
  );
}

export function dayHasMeals(day: DayMenu): boolean {
  return day.morningSnack.length + day.lunch.length + day.afternoonSnack.length > 0;
}
