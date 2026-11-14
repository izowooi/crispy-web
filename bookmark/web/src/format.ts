import type { Bookmark } from "./api";

const rtf = new Intl.RelativeTimeFormat("ko", { numeric: "auto" });
const dateFmt = new Intl.DateTimeFormat("ko", { month: "long", day: "numeric" });
const fullDateFmt = new Intl.DateTimeFormat("ko", { year: "numeric", month: "long", day: "numeric" });
const exactFmt = new Intl.DateTimeFormat("ko", { dateStyle: "medium", timeStyle: "short" });

export function relativeTime(ts: number, now = Date.now()): string {
  const sec = Math.round((now - ts) / 1000);
  if (sec < 60) return "방금 전";
  const min = Math.round(sec / 60);
  if (min < 60) return rtf.format(-min, "minute");
  const hour = Math.round(min / 60);
  if (hour < 24) return rtf.format(-hour, "hour");
  const startOfToday = new Date(now).setHours(0, 0, 0, 0);
  const days = Math.ceil((startOfToday - ts) / 86_400_000);
  if (days <= 6) return rtf.format(-days, "day");
  const d = new Date(ts);
  return d.getFullYear() === new Date(now).getFullYear() ? dateFmt.format(d) : fullDateFmt.format(d);
}

export const exactTime = (ts: number) => exactFmt.format(new Date(ts));

export function displayTitle(b: Bookmark): string {
  const firstLine = b.note.split("\n").find((l) => l.trim())?.trim();
  return b.title.trim() || (b.url ? "" : firstLine) || b.domain || b.url || firstLine || "제목 없음";
}

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
