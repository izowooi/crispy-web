"use client";

import { Camera, Loader2, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { removeMonth } from "@/app/actions";
import { MonthEditor } from "@/components/month-editor";
import { resizeForUpload } from "@/lib/resize-image";
import type { MonthSheet, StoredMonth } from "@/lib/schema";

type Draft = { sheet: MonthSheet; warnings: string[]; imageKey: string | null; imageUrl: string | null };

type Props = {
  daycare: { id: string; name: string };
  months: StoredMonth[];
  today: string;
  editYm: string | null;
};

export function ManageClient({ daycare, months: initialMonths, today, editYm }: Props) {
  const [months, setMonths] = useState(initialMonths);
  const existing = editYm ? months.find((m) => m.ym === editYm) : undefined;
  const [draft, setDraft] = useState<Draft | null>(
    existing
      ? {
          sheet: existing.sheet,
          warnings: [],
          imageKey: existing.imageKey,
          imageUrl: existing.imageKey ? `/api/images/${existing.imageKey}` : null,
        }
      : null,
  );

  if (draft) {
    return (
      <MonthEditor
        daycareId={daycare.id}
        initial={draft.sheet}
        warnings={draft.warnings}
        imageKey={draft.imageKey}
        imageUrl={draft.imageUrl}
        today={today}
        existingYms={months.map((m) => m.ym)}
        onCancel={() => setDraft(null)}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <UploadPanel daycareId={daycare.id} today={today} onDraft={setDraft} />
      <section className="rounded-3xl border border-line bg-panel p-5 sm:p-6">
        <h2 className="text-lg font-extrabold">저장된 식단</h2>
        {months.length === 0 ? (
          <p className="mt-3 text-sm text-muted">아직 저장된 식단이 없어요.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {months.map((m) => (
              <li key={m.ym} className="flex items-center justify-between gap-2 py-3">
                <Link href={`/c/${daycare.id}?date=${m.sheet.days[0]?.date ?? ""}`} className="min-w-0">
                  <p className="font-bold">
                    {Number(m.ym.slice(0, 4))}년 {Number(m.ym.slice(5))}월
                  </p>
                  <p className="truncate text-xs text-muted">
                    {m.sheet.days.length}일 · {m.sheet.title}
                  </p>
                </Link>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        sheet: m.sheet,
                        warnings: [],
                        imageKey: m.imageKey,
                        imageUrl: m.imageKey ? `/api/images/${m.imageKey}` : null,
                      })
                    }
                    className="grid h-9 w-9 place-items-center rounded-full bg-panel-muted"
                    aria-label={`${m.ym} 수정`}
                  >
                    <Pencil size={15} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!window.confirm(`${Number(m.ym.slice(5))}월 식단을 삭제할까요?`)) return;
                      const res = await removeMonth(daycare.id, m.ym);
                      if (res.ok) setMonths((all) => all.filter((x) => x.ym !== m.ym));
                      else window.alert(res.error);
                    }}
                    className="grid h-9 w-9 place-items-center rounded-full bg-panel-muted text-danger"
                    aria-label={`${m.ym} 삭제`}
                  >
                    <Trash2 size={15} aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function UploadPanel({
  daycareId,
  today,
  onDraft,
}: {
  daycareId: string;
  today: string;
  onDraft: (draft: Draft) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!busy) return;
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [busy]);

  function pick(next: File | null) {
    setError(null);
    setFile(next);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(next ? URL.createObjectURL(next) : null);
  }

  async function analyze() {
    if (!file) return;
    setBusy(true);
    setElapsed(0);
    setError(null);
    try {
      const blob = await resizeForUpload(file);
      const form = new FormData();
      form.set("image", new File([blob], "menu.jpg", { type: "image/jpeg" }));
      form.set("year", today.slice(0, 4));
      form.set("month", String(Number(today.slice(5, 7))));
      const res = await fetch(`/api/daycares/${daycareId}/analyze`, { method: "POST", body: form });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        sheet?: MonthSheet;
        warnings?: string[];
        imageKey?: string;
      };
      if (!res.ok || !body.sheet) throw new Error(body.error ?? "분석에 실패했어요.");
      onDraft({ sheet: body.sheet, warnings: body.warnings ?? [], imageKey: body.imageKey ?? null, imageUrl: preview });
    } catch (e) {
      setError(e instanceof Error ? e.message : "분석에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-3xl border border-line bg-panel p-5 sm:p-6">
      <h2 className="text-lg font-extrabold">새 식단표 올리기</h2>
      <p className="mt-1 text-sm text-muted">
        한 달 식단표 사진을 올리면 AI가 날짜별 간식·점심을 읽어요. 저장 전에 결과를 확인하고 고칠 수 있어요.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
        aria-label="식단표 사진 선택"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="mt-4 flex w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed border-line bg-canvas p-4 text-muted hover:bg-panel-muted"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="선택한 식단표" className="max-h-80 rounded-xl object-contain" />
        ) : (
          <>
            <Camera size={28} aria-hidden />
            <span className="font-semibold">사진 선택 또는 촬영</span>
          </>
        )}
      </button>
      {file && !busy && (
        <p className="mt-2 text-center text-xs text-muted">
          {file.name} · 다른 사진을 쓰려면 위를 눌러 다시 선택하세요
        </p>
      )}

      {error && <p className="mt-3 rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">{error}</p>}

      <button
        type="button"
        onClick={analyze}
        disabled={!file || busy}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3.5 font-bold text-accent-ink disabled:opacity-50"
      >
        {busy ? (
          <>
            <Loader2 size={18} className="animate-spin" aria-hidden />
            AI가 식단표를 읽는 중… {elapsed}초
          </>
        ) : (
          "AI로 식단표 읽기"
        )}
      </button>
      {busy && <p className="mt-2 text-center text-xs text-muted">보통 30초~1분 걸려요. 이 화면을 닫지 마세요.</p>}
    </section>
  );
}
