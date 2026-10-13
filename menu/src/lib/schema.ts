import { z } from "zod";

export const MenuItemSchema = z.object({
  name: z.string(),
  allergens: z.array(z.number().int()),
});

export const DayMenuSchema = z.object({
  date: z.string().describe("YYYY-MM-DD"),
  weekday: z.string().describe("사진에 적힌 요일 한 글자(월~일). 적혀 있지 않으면 빈 문자열"),
  closed: z.boolean(),
  closedReason: z.string().nullable(),
  event: z.string().nullable(),
  morningSnack: z.array(MenuItemSchema),
  lunch: z.array(MenuItemSchema),
  afternoonSnack: z.array(MenuItemSchema),
  kcal: z.number().nullable(),
  protein: z.number().nullable(),
  origin: z.string().nullable(),
  note: z.string().nullable(),
});

export const MonthSheetSchema = z.object({
  year: z.number().int(),
  month: z.number().int(),
  title: z.string(),
  notes: z.array(z.string()),
  allergenLegend: z.array(z.object({ number: z.number().int(), name: z.string() })),
  footer: z.array(z.string()),
  days: z.array(DayMenuSchema),
});

export type MenuItem = z.infer<typeof MenuItemSchema>;
export type DayMenu = z.infer<typeof DayMenuSchema>;
export type MonthSheet = z.infer<typeof MonthSheetSchema>;

export type StoredMonth = {
  ym: string;
  sheet: MonthSheet;
  imageKey: string | null;
  updatedAt: number;
};
