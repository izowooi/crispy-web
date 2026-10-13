import type { DayMenu, MenuItem } from "@/lib/schema";

const CIRCLED = "⓪①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳";

export function allergenMark(n: number): string {
  return n > 0 && n < CIRCLED.length ? CIRCLED[n] : `(${n})`;
}

export type Legend = Map<number, string>;

function Item({ item, legend }: { item: MenuItem; legend: Legend }) {
  return (
    <li className="py-1 leading-relaxed [overflow-wrap:anywhere]">
      {item.name}
      {item.allergens.length > 0 && (
        <span
          className="ml-1 text-[0.8em] tracking-tight text-muted"
          title={item.allergens.map((n) => legend.get(n) ?? `${n}번`).join(", ")}
          aria-label={`알레르기: ${item.allergens.map((n) => legend.get(n) ?? `${n}번`).join(", ")}`}
        >
          {item.allergens.map(allergenMark).join("")}
        </span>
      )}
    </li>
  );
}

function MealCard({
  emoji,
  label,
  items,
  legend,
  featured = false,
}: {
  emoji: string;
  label: string;
  items: MenuItem[];
  legend: Legend;
  featured?: boolean;
}) {
  return (
    <section
      className={`rounded-3xl border p-5 sm:p-6 ${featured ? "border-lunch-line bg-lunch" : "border-line bg-panel"}`}
      aria-label={label}
    >
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted">
        <span className="text-2xl" aria-hidden>
          {emoji}
        </span>
        {label}
      </h3>
      {items.length ? (
        <ul className={featured ? "text-lg" : "text-base sm:text-lg"}>
          {items.map((item, i) => (
            <Item key={`${item.name}-${i}`} item={item} legend={legend} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">없음</p>
      )}
    </section>
  );
}

export function DayCard({ day, legend }: { day: DayMenu; legend: Legend }) {
  if (day.closed) {
    return (
      <div className="rounded-3xl bg-panel-muted px-6 py-12 text-center">
        <p className="text-4xl" aria-hidden>
          🏡
        </p>
        <h2 className="mt-3 text-2xl font-extrabold">{day.closedReason ?? "휴원"}</h2>
        <p className="mt-2 text-muted">이날은 어린이집 급식이 없어요.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-3 sm:gap-4 md:grid-cols-[1fr_1.4fr_1fr]">
        <MealCard emoji="🍎" label="오전 간식" items={day.morningSnack} legend={legend} />
        <MealCard emoji="🍚" label="점심" items={day.lunch} legend={legend} featured />
        <MealCard emoji="🍠" label="오후 간식" items={day.afternoonSnack} legend={legend} />
      </div>
      {(day.kcal || day.protein || day.origin || day.note) && (
        <div className="mt-4 space-y-1 px-1 text-sm text-muted">
          {(day.kcal || day.protein) && (
            <p className="flex flex-wrap gap-x-4">
              {day.kcal && (
                <span>
                  열량 <b className="text-ink-soft">{day.kcal}kcal</b>
                </span>
              )}
              {day.protein && (
                <span>
                  단백질 <b className="text-ink-soft">{day.protein}g</b>
                </span>
              )}
            </p>
          )}
          {day.origin && <p>원산지 · {day.origin}</p>}
          {day.note && <p>메모 · {day.note}</p>}
        </div>
      )}
    </div>
  );
}
