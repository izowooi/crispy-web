"use client";

import { CalendarDays, ChevronLeft, ChevronRight, ImageIcon, Upload } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { rememberDaycare } from "@/app/actions";
import { DayCard, type Legend, allergenMark } from "@/components/day-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { addDays, daysInMonth, formatKoreanDate, isWeekend, nearestDate, todayKST, weekdayKo, ymOf } from "@/lib/dates";
import type { DayMenu, StoredMonth } from "@/lib/schema";

type View = "day" | "month";

type Props = {
  daycare: { id: string; name: string };
  months: StoredMonth[];
  today: string;
  initialDate: string;
  initialView: View;
  editable: boolean;
};

function syncUrl(date: string, view: View, today: string) {
  const params = new URLSearchParams();
  if (date !== today) params.set("date", date);
  if (view === "month") params.set("view", "month");
  const query = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
}

export function MenuViewer({ daycare, months, today, initialDate, initialView, editable }: Props) {
  const [date, setDate] = useState(initialDate);
  const [view, setView] = useState<View>(initialView);

  const days = useMemo(() => {
    const map = new Map<string, DayMenu>();
    for (const m of months) for (const d of m.sheet.days) map.set(d.date, d);
    return map;
  }, [months]);
  const sortedDates = useMemo(() => [...days.keys()].sort(), [days]);
  const monthByYm = useMemo(() => new Map(months.map((m) => [m.ym, m])), [months]);
  const currentMonth = monthByYm.get(ymOf(date));
  const legend: Legend = useMemo(() => {
    const map = new Map<number, string>();
    for (const m of months) for (const a of m.sheet.allergenLegend) map.set(a.number, a.name);
    return map;
  }, [months]);

  useEffect(() => {
    void rememberDaycare(daycare.id);
  }, [daycare.id]);

  useEffect(() => {
    syncUrl(date, view, today);
  }, [date, view, today]);

  useEffect(() => {
    // 홈 화면 앱·bfcache는 다음 날 새로고침 없이 재개된다. 날짜가 바뀌었으면 새 "오늘"로 다시 연다.
    function refreshIfDayChanged() {
      if (document.visibilityState === "visible" && todayKST() !== today) window.location.replace(window.location.pathname);
    }
    document.addEventListener("visibilitychange", refreshIfDayChanged);
    window.addEventListener("pageshow", refreshIfDayChanged);
    return () => {
      document.removeEventListener("visibilitychange", refreshIfDayChanged);
      window.removeEventListener("pageshow", refreshIfDayChanged);
    };
  }, [today]);

  const prevDate = nearestDate(sortedDates, date, -1);
  const nextDate = nearestDate(sortedDates, date, 1);

  const go = useCallback((target: string | null) => {
    if (target) setDate(target);
  }, []);

  useEffect(() => {
    if (view !== "day") return;
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === "ArrowLeft") go(prevDate);
      if (event.key === "ArrowRight") go(nextDate);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, prevDate, nextDate, go]);

  const touchStart = useRef<{ x: number; y: number } | null>(null);
  function onTouchStart(event: React.TouchEvent) {
    const t = event.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(event: React.TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = event.changedTouches[0];
    const dx = t.clientX - start.x;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(t.clientY - start.y) * 1.5) go(dx > 0 ? prevDate : nextDate);
  }

  const day = days.get(date);
  const isToday = date === today;

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-5 sm:px-6 sm:pt-7">
      <header className="flex items-center justify-between gap-2">
        <Link href="/?pick=1" className="flex min-w-0 items-center gap-2 font-extrabold" title="다른 어린이집 보기">
          <span aria-hidden>◒</span>
          <span className="truncate">{daycare.name}</span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/c/${daycare.id}/manage`}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-panel px-3 text-xs font-semibold hover:bg-panel-muted"
          >
            <Upload size={14} aria-hidden />
            {editable ? "식단 올리기" : "관리"}
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <section className="mb-5 mt-7 sm:mb-7 sm:mt-10">
        <p className="text-xs font-semibold tracking-[0.12em] text-muted">
          {isToday ? "TODAY" : formatKoreanDate(date)}
        </p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
          {view === "month" ? `${Number(date.slice(5, 7))}월 전체 식단` : isToday ? "오늘은 뭘 먹을까요?" : "이날은 뭘 먹을까요?"}
        </h1>
        {currentMonth && <p className="mt-2 text-sm text-muted">{currentMonth.sheet.title}</p>}
      </section>

      <nav className="mb-6 flex gap-1 rounded-2xl bg-panel-muted p-1" aria-label="보기 선택">
        {(
          [
            ["day", "날짜별"],
            ["month", "한 달 전체"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={view === key}
            onClick={() => setView(key)}
            className="flex-1 rounded-xl py-2.5 text-sm font-bold text-muted aria-pressed:bg-accent aria-pressed:text-accent-ink aria-pressed:shadow-sm"
          >
            {label}
          </button>
        ))}
      </nav>

      {view === "day" ? (
        <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => go(prevDate)}
              disabled={!prevDate}
              aria-label="이전 식단일"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-panel-muted disabled:opacity-30"
            >
              <ChevronLeft aria-hidden />
            </button>
            <div className="min-w-0 text-center">
              <p className="text-xl font-extrabold sm:text-2xl" aria-live="polite">
                {formatKoreanDate(date)}
                {isToday && <span className="ml-2 align-middle text-xs font-bold text-accent">오늘</span>}
              </p>
              <label className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
                <CalendarDays size={13} aria-hidden />
                <span className="sr-only">날짜 선택</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => e.target.value && setDate(e.target.value)}
                  className="bg-transparent text-center text-xs text-muted"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={() => go(nextDate)}
              disabled={!nextDate}
              aria-label="다음 식단일"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-panel-muted disabled:opacity-30"
            >
              <ChevronRight aria-hidden />
            </button>
          </div>
          <div className="mb-5 mt-2 h-6 text-center">
            {!isToday && (
              <button type="button" onClick={() => setDate(today)} className="text-xs font-semibold text-accent underline underline-offset-4">
                오늘로 돌아가기
              </button>
            )}
          </div>

          {day?.event && (
            <p className="mb-3 rounded-2xl bg-warm-soft px-4 py-3 text-sm font-semibold text-warm-ink">📌 {day.event}</p>
          )}
          {day ? (
            <DayCard day={day} legend={legend} />
          ) : (
            <EmptyDay
              date={date}
              hasMonth={Boolean(currentMonth)}
              nextDate={nextDate}
              prevDate={prevDate}
              onGo={go}
              manageHref={`/c/${daycare.id}/manage`}
            />
          )}
        </div>
      ) : (
        <MonthView
          ym={ymOf(date)}
          months={months}
          days={days}
          today={today}
          selected={date}
          onPick={(d) => {
            setDate(d);
            setView("day");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onMonth={(ym) => {
            const first = sortedDates.find((d) => d.startsWith(ym));
            setDate(today.startsWith(ym) ? today : (first ?? `${ym}-01`));
          }}
        />
      )}

      <MonthDetails month={currentMonth} legend={legend} />
    </main>
  );
}

function EmptyDay({
  date,
  hasMonth,
  nextDate,
  prevDate,
  onGo,
  manageHref,
}: {
  date: string;
  hasMonth: boolean;
  nextDate: string | null;
  prevDate: string | null;
  onGo: (d: string | null) => void;
  manageHref: string;
}) {
  const month = Number(date.slice(5, 7));
  const title = !hasMonth ? `${month}월 식단이 아직 없어요` : isWeekend(date) ? "주말에는 식단이 없어요" : "이날은 식단이 없어요";
  return (
    <div className="rounded-3xl bg-panel-muted px-6 py-12 text-center">
      <p className="text-4xl" aria-hidden>
        {isWeekend(date) ? "🧸" : "🗓️"}
      </p>
      <h2 className="mt-3 text-2xl font-extrabold">{title}</h2>
      {!hasMonth && <p className="mt-2 text-sm text-muted">식단표 사진을 올리면 날짜별로 정리해 드려요.</p>}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {nextDate && (
          <button type="button" onClick={() => onGo(nextDate)} className="rounded-full bg-accent px-4 py-2.5 text-sm font-bold text-accent-ink">
            다음 식단 · {formatKoreanDate(nextDate)}
          </button>
        )}
        {!nextDate && prevDate && (
          <button type="button" onClick={() => onGo(prevDate)} className="rounded-full border border-line bg-panel px-4 py-2.5 text-sm font-bold">
            지난 식단 · {formatKoreanDate(prevDate)}
          </button>
        )}
        {!hasMonth && (
          <Link href={manageHref} className="rounded-full border border-line bg-panel px-4 py-2.5 text-sm font-bold">
            {month}월 식단표 올리기
          </Link>
        )}
      </div>
    </div>
  );
}

function short(day: DayMenu): string {
  if (day.closed) return day.closedReason ?? "휴원";
  const main = day.lunch.find((i) => !/밥$/.test(i.name)) ?? day.lunch[0];
  return main?.name ?? "";
}

function MonthView({
  ym,
  months,
  days,
  today,
  selected,
  onPick,
  onMonth,
}: {
  ym: string;
  months: StoredMonth[];
  days: Map<string, DayMenu>;
  today: string;
  selected: string;
  onPick: (d: string) => void;
  onMonth: (ym: string) => void;
}) {
  const [year, month] = ym.split("-").map(Number);
  const yms = months.map((m) => m.ym);
  const index = yms.indexOf(ym);
  const prevYm = index > 0 ? yms[index - 1] : index === -1 ? [...yms].reverse().find((v) => v < ym) : undefined;
  const nextYm = index >= 0 && index < yms.length - 1 ? yms[index + 1] : index === -1 ? yms.find((v) => v > ym) : undefined;

  const monthDays = [...days.values()].filter((d) => d.date.startsWith(ym));
  const showWeekend = monthDays.some((d) => isWeekend(d.date));
  const cols = showWeekend ? ["일", "월", "화", "수", "목", "금", "토"] : ["월", "화", "수", "목", "금"];
  const cells: (string | null)[] = [];
  const first = `${ym}-01`;
  const lead = showWeekend ? "일월화수목금토".indexOf(weekdayKo(first)) : Math.max(0, "월화수목금".indexOf(weekdayKo(first)));
  for (let i = 0; i < lead; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth(year, month); d += 1) {
    const date = addDays(first, d - 1);
    if (!showWeekend && isWeekend(date)) continue;
    cells.push(date);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          disabled={!prevYm}
          onClick={() => prevYm && onMonth(prevYm)}
          className="grid h-10 w-10 place-items-center rounded-full bg-panel-muted disabled:opacity-30"
          aria-label="이전 달"
        >
          <ChevronLeft size={18} aria-hidden />
        </button>
        <p className="text-lg font-extrabold">
          {year}년 {month}월
        </p>
        <button
          type="button"
          disabled={!nextYm}
          onClick={() => nextYm && onMonth(nextYm)}
          className="grid h-10 w-10 place-items-center rounded-full bg-panel-muted disabled:opacity-30"
          aria-label="다음 달"
        >
          <ChevronRight size={18} aria-hidden />
        </button>
      </div>

      {monthDays.length === 0 ? (
        <div className="rounded-3xl bg-panel-muted px-6 py-12 text-center text-muted">{month}월 식단이 아직 없어요.</div>
      ) : (
        <>
          <div className={`grid gap-1.5 ${showWeekend ? "grid-cols-7" : "grid-cols-5"}`}>
            {cols.map((c) => (
              <span key={c} className="py-1 text-center text-xs text-muted">
                {c}
              </span>
            ))}
            {cells.map((date, i) => {
              if (!date) return <span key={`blank-${i}`} />;
              const d = days.get(date);
              const label = d ? short(d) : "";
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => onPick(date)}
                  className={`min-h-16 rounded-xl border px-1 py-2 text-center sm:min-h-20 ${
                    date === today
                      ? "border-accent bg-accent text-accent-ink"
                      : d?.closed || !d
                        ? "border-transparent bg-panel-muted text-muted"
                        : "border-line bg-panel"
                  } ${date === selected && date !== today ? "ring-2 ring-warm" : ""}`}
                  aria-label={`${formatKoreanDate(date)} ${label}`}
                >
                  <span className="block text-sm font-bold">{Number(date.slice(8))}</span>
                  <span className="mt-0.5 line-clamp-2 block text-[10px] leading-tight opacity-80 sm:text-xs">{label}</span>
                  {d?.event && <span className="mx-auto mt-1 block h-1.5 w-1.5 rounded-full bg-warm" aria-hidden />}
                </button>
              );
            })}
          </div>

          <ol className="mt-8 space-y-3">
            {monthDays.map((d) => (
              <li key={d.date}>
                <button
                  type="button"
                  onClick={() => onPick(d.date)}
                  className={`w-full rounded-2xl border p-4 text-left hover:bg-panel-muted ${
                    d.date === today ? "border-accent bg-panel" : "border-line bg-panel"
                  }`}
                >
                  <p className="flex flex-wrap items-baseline gap-x-2 font-bold">
                    {formatKoreanDate(d.date)}
                    {d.date === today && <span className="text-xs text-accent">오늘</span>}
                    {d.event && <span className="text-xs font-semibold text-warm-ink">📌 {d.event}</span>}
                  </p>
                  {d.closed ? (
                    <p className="mt-1 text-sm text-muted">{d.closedReason ?? "휴원"}</p>
                  ) : (
                    <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-[4.5rem_1fr]">
                      {(
                        [
                          ["오전 간식", d.morningSnack],
                          ["점심", d.lunch],
                          ["오후 간식", d.afternoonSnack],
                        ] as const
                      ).map(([label, items]) => (
                        <div key={label} className="contents">
                          <dt className="text-xs font-semibold text-muted sm:pt-0.5">{label}</dt>
                          <dd className="mb-1 [overflow-wrap:anywhere] sm:mb-0">
                            {items.length
                              ? items.map((it) => `${it.name}${it.allergens.length ? it.allergens.map(allergenMark).join("") : ""}`).join(" · ")
                              : "—"}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </button>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}

function MonthDetails({ month, legend }: { month: StoredMonth | undefined; legend: Legend }) {
  if (!month) return null;
  const { sheet } = month;
  return (
    <div className="mt-10 space-y-3 text-sm">
      {legend.size > 0 && (
        <details className="rounded-2xl border border-line bg-panel p-4">
          <summary className="cursor-pointer font-bold">알레르기 표시 안내</summary>
          <p className="mt-3 leading-7 text-ink-soft">
            {[...legend.entries()]
              .sort((a, b) => a[0] - b[0])
              .map(([n, name]) => `${allergenMark(n)} ${name}`)
              .join("  ")}
          </p>
        </details>
      )}
      {(sheet.notes.length > 0 || sheet.footer.length > 0) && (
        <details className="rounded-2xl border border-line bg-panel p-4">
          <summary className="cursor-pointer font-bold">안내사항 · 원산지</summary>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-ink-soft">
            {[...sheet.notes, ...sheet.footer].map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </details>
      )}
      {month.imageKey && (
        <details className="rounded-2xl border border-line bg-panel p-4">
          <summary className="cursor-pointer font-bold">
            <ImageIcon size={14} className="mr-1 inline align-[-2px]" aria-hidden />
            원본 식단표 보기
          </summary>
          <a href={`/api/images/${month.imageKey}`} target="_blank" rel="noopener" className="mt-3 block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/images/${month.imageKey}`} alt={`${sheet.title} 원본`} loading="lazy" className="w-full rounded-xl" />
          </a>
        </details>
      )}
      <p className="pt-4 text-center text-xs text-muted">
        AI가 사진을 읽어 정리했어요. 알레르기 정보는 원본과 함께 확인해 주세요. 날짜는 한국 시간 기준입니다.
      </p>
    </div>
  );
}
