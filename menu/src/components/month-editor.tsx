"use client";

import { AlertTriangle, Loader2, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveMonth } from "@/app/actions";
import { formatKoreanDate, isIsoDate, toYm, weekdayKo } from "@/lib/dates";
import type { DayMenu, MonthSheet } from "@/lib/schema";
import { itemsToText, textToItems } from "@/lib/sheet";

type DayForm = {
  date: string;
  closed: boolean;
  closedReason: string;
  event: string;
  morningSnack: string;
  lunch: string;
  afternoonSnack: string;
  kcal: string;
  protein: string;
  origin: string;
  note: string;
};

function toForm(day: DayMenu): DayForm {
  return {
    date: day.date,
    closed: day.closed,
    closedReason: day.closedReason ?? "",
    event: day.event ?? "",
    morningSnack: itemsToText(day.morningSnack),
    lunch: itemsToText(day.lunch),
    afternoonSnack: itemsToText(day.afternoonSnack),
    kcal: day.kcal?.toString() ?? "",
    protein: day.protein?.toString() ?? "",
    origin: day.origin ?? "",
    note: day.note ?? "",
  };
}

function fromForm(form: DayForm): DayMenu {
  const num = (v: string) => (v.trim() && Number.isFinite(Number(v)) ? Number(v) : null);
  return {
    date: form.date,
    weekday: weekdayKo(form.date),
    closed: form.closed,
    closedReason: form.closedReason || null,
    event: form.event || null,
    morningSnack: textToItems(form.morningSnack),
    lunch: textToItems(form.lunch),
    afternoonSnack: textToItems(form.afternoonSnack),
    kcal: num(form.kcal),
    protein: num(form.protein),
    origin: form.origin || null,
    note: form.note || null,
  };
}

const field = "w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm";

type Props = {
  daycareId: string;
  initial: MonthSheet;
  warnings: string[];
  imageKey: string | null;
  imageUrl: string | null;
  today: string;
  existingYms: string[];
  onCancel: () => void;
};

export function MonthEditor({ daycareId, initial, warnings, imageKey, imageUrl, today, existingYms, onCancel }: Props) {
  const router = useRouter();
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [title, setTitle] = useState(initial.title);
  const [days, setDays] = useState<DayForm[]>(() => initial.days.map(toForm));
  const [newDate, setNewDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ym = toYm(year, month);
  const outside = days.filter((d) => !d.date.startsWith(`${ym}-`));

  function update(index: number, patch: Partial<DayForm>) {
    setDays((all) => all.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  function shiftMonth(nextYear: number, nextMonth: number) {
    // AI가 연·월을 잘못 읽었을 때 날짜의 '일'은 유지한 채 연·월만 옮긴다.
    const prefix = toYm(nextYear, nextMonth);
    setDays((all) => all.map((d) => ({ ...d, date: `${prefix}-${d.date.slice(8)}` })).filter((d) => isIsoDate(d.date)));
    setYear(nextYear);
    setMonth(nextMonth);
  }

  function addDay() {
    if (!isIsoDate(newDate) || days.some((d) => d.date === newDate)) return;
    setDays((all) =>
      [...all, toForm({ date: newDate, weekday: "", closed: false, closedReason: null, event: null, morningSnack: [], lunch: [], afternoonSnack: [], kcal: null, protein: null, origin: null, note: null })].sort(
        (a, b) => a.date.localeCompare(b.date),
      ),
    );
    setNewDate("");
  }

  async function save() {
    setSaving(true);
    setError(null);
    const sheet: MonthSheet = { ...initial, year, month, title, days: days.map(fromForm) };
    const res = await saveMonth(daycareId, { sheet, year, month, imageKey });
    if (!res.ok) {
      setError(res.error);
      setSaving(false);
      return;
    }
    const target = today.startsWith(`${res.ym}-`) ? "" : `?date=${res.firstDate ?? ""}`;
    router.push(`/c/${daycareId}${target}`);
  }

  return (
    <div className={imageUrl ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]" : ""}>
      {imageUrl && (
        <aside className="lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-auto">
          <details
            className="rounded-3xl border border-line bg-panel p-3"
            ref={(el) => {
              // 넓은 화면에서는 원본과 나란히 비교하도록 펼치고, 휴대폰에서는 접어 둔다.
              if (el && window.matchMedia("(min-width: 1024px)").matches) el.open = true;
            }}
          >
            <summary className="cursor-pointer px-2 py-1 text-sm font-bold">원본 사진 (비교용)</summary>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="원본 식단표" className="mt-2 w-full rounded-2xl" />
          </details>
        </aside>
      )}

      <div>
        <section className="rounded-3xl border border-line bg-panel p-5">
          <h2 className="text-lg font-extrabold">읽은 결과 확인</h2>
          <p className="mt-1 text-sm text-muted">
            한 줄에 메뉴 하나씩, 알레르기 번호는 <code className="rounded bg-panel-muted px-1">[5,6]</code>처럼 적어요.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-[7rem_6rem_1fr]">
            <label className="text-sm font-semibold">
              연도
              <input
                type="number"
                value={year}
                onChange={(e) => shiftMonth(Number(e.target.value), month)}
                className={`${field} mt-1`}
              />
            </label>
            <label className="text-sm font-semibold">
              월
              <select value={month} onChange={(e) => shiftMonth(year, Number(e.target.value))} className={`${field} mt-1`}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {m}월
                  </option>
                ))}
              </select>
            </label>
            <label className="col-span-2 text-sm font-semibold sm:col-span-1">
              제목
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={`${field} mt-1`} />
            </label>
          </div>
          {existingYms.includes(ym) && (
            <p className="mt-3 text-sm font-semibold text-warm-ink">저장하면 기존 {month}월 식단을 이 내용으로 바꿔요.</p>
          )}
          {(warnings.length > 0 || outside.length > 0) && (
            <ul className="mt-4 space-y-1 rounded-2xl bg-warm-soft p-4 text-sm text-warm-ink">
              {warnings.map((w, i) => (
                <li key={i} className="flex gap-2">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden />
                  {w}
                </li>
              ))}
              {outside.length > 0 && <li>{outside.length}개 날짜가 {month}월이 아니라서 저장 시 제외돼요.</li>}
            </ul>
          )}
        </section>

        <ol className="mt-4 space-y-3">
          {days.map((d, i) => (
            <li key={d.date} className="rounded-3xl border border-line bg-panel p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-extrabold">{formatKoreanDate(d.date)}</p>
                <div className="flex items-center gap-3 text-sm">
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={d.closed} onChange={(e) => update(i, { closed: e.target.checked })} />
                    휴원
                  </label>
                  <button
                    type="button"
                    onClick={() => setDays((all) => all.filter((_, j) => j !== i))}
                    className="grid h-8 w-8 place-items-center rounded-full bg-panel-muted"
                    aria-label={`${formatKoreanDate(d.date)} 삭제`}
                  >
                    <X size={14} aria-hidden />
                  </button>
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {d.closed ? (
                  <input
                    value={d.closedReason}
                    onChange={(e) => update(i, { closedReason: e.target.value })}
                    placeholder="휴원 사유 (예: 한글날)"
                    className={`${field} sm:col-span-2`}
                    aria-label="휴원 사유"
                  />
                ) : (
                  <>
                    {(
                      [
                        ["morningSnack", "오전 간식", 2],
                        ["lunch", "점심", 5],
                        ["afternoonSnack", "오후 간식", 2],
                      ] as const
                    ).map(([key, label, rows]) => (
                      <label key={key} className={`text-xs font-semibold text-muted ${key === "lunch" ? "sm:row-span-2" : ""}`}>
                        {label}
                        <textarea
                          value={d[key]}
                          rows={rows}
                          onChange={(e) => update(i, { [key]: e.target.value })}
                          className={`${field} mt-1 h-[calc(100%-1.25rem)] resize-y text-ink`}
                        />
                      </label>
                    ))}
                  </>
                )}
                <input value={d.event} onChange={(e) => update(i, { event: e.target.value })} placeholder="행사 (선택)" className={field} aria-label="행사" />
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["kcal", "열량", "kcal"],
                      ["protein", "단백질", "g"],
                    ] as const
                  ).map(([key, label, unit]) => (
                    <label key={key} className="relative">
                      <input
                        value={d[key]}
                        onChange={(e) => update(i, { [key]: e.target.value })}
                        placeholder={label}
                        inputMode="numeric"
                        className={`${field} pr-12`}
                        aria-label={`${label} (${unit})`}
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">{unit}</span>
                    </label>
                  ))}
                </div>
                <input value={d.origin} onChange={(e) => update(i, { origin: e.target.value })} placeholder="원산지 (선택)" className={field} aria-label="원산지" />
                <input value={d.note} onChange={(e) => update(i, { note: e.target.value })} placeholder="메모 (선택)" className={field} aria-label="메모" />
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-4 flex gap-2">
          <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className={`${field} max-w-48`} aria-label="추가할 날짜" />
          <button type="button" onClick={addDay} className="inline-flex items-center gap-1 rounded-xl bg-panel-muted px-3 text-sm font-semibold">
            <Plus size={15} aria-hidden /> 날짜 추가
          </button>
        </div>

        {error && <p className="mt-4 text-sm font-semibold text-danger">{error}</p>}
        <div className="sticky bottom-0 mt-4 flex flex-row-reverse gap-2 bg-canvas/95 py-3 backdrop-blur">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-accent px-6 py-3.5 font-bold text-accent-ink disabled:opacity-50 sm:flex-none"
          >
            {saving && <Loader2 size={18} className="animate-spin" aria-hidden />}
            {month}월 식단 저장
          </button>
          <button type="button" onClick={onCancel} className="rounded-2xl border border-line bg-panel px-6 py-3.5 font-bold">
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
