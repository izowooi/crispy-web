export const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: string): boolean {
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

/** "오늘"은 사용자가 어디 있든 어린이집 기준인 한국 시간으로 계산한다. */
export function todayKST(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function toUtc(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUtc(d);
}

export function weekdayKo(date: string): string {
  return WEEKDAYS_KO[toUtc(date).getUTCDay()];
}

export function isWeekend(date: string): boolean {
  const day = toUtc(date).getUTCDay();
  return day === 0 || day === 6;
}

export function ymOf(date: string): string {
  return date.slice(0, 7);
}

export function toYm(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function formatKoreanDate(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return `${m}월 ${d}일 (${weekdayKo(date)})`;
}

/** 정렬된 날짜 목록에서 기준일 이후(또는 이전)로 가장 가까운 날짜. */
export function nearestDate(sorted: string[], from: string, direction: 1 | -1): string | null {
  if (direction === 1) return sorted.find((d) => d > from) ?? null;
  for (let i = sorted.length - 1; i >= 0; i -= 1) if (sorted[i] < from) return sorted[i];
  return null;
}

/** R2 lifecycle 규칙(expire-menu-photos-180d)과 같은 값이어야 한다. */
export const PHOTO_RETENTION_DAYS = 180;

/**
 * 원본 사진은 R2 lifecycle이 업로드 180일 뒤 지운다. 키에 담긴 업로드일로 만료를 판단해
 * 깨진 이미지 링크를 보여주지 않는다. 경계에서 하루 먼저 숨긴다.
 */
export function photoStillStored(imageKey: string | null, today: string): boolean {
  if (!imageKey) return false;
  const uploaded = /\/(\d{4}-\d{2}-\d{2})-[^/]+$/.exec(imageKey)?.[1];
  if (!uploaded || !isIsoDate(uploaded)) return true;
  return addDays(uploaded, PHOTO_RETENTION_DAYS - 1) > today;
}
