import Link from "next/link";
import { notFound } from "next/navigation";
import { UnlockForm } from "@/components/forms";
import { ManageClient } from "@/components/manage-client";
import { ThemeToggle } from "@/components/theme-toggle";
import { todayKST } from "@/lib/dates";
import { getDaycare, listMonths } from "@/lib/server/db";
import { getEnv } from "@/lib/server/env";
import { canEdit } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export default async function ManagePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ym?: string }>;
}) {
  const [{ id }, { ym }] = await Promise.all([params, searchParams]);
  const env = await getEnv();
  const daycare = await getDaycare(env, id);
  if (!daycare) notFound();
  const editable = await canEdit(daycare);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-5 sm:px-6 sm:pt-7">
      <header className="flex items-center justify-between gap-2">
        <Link href={`/c/${daycare.id}`} className="truncate font-extrabold">
          ← {daycare.name} 식단 보기
        </Link>
        <ThemeToggle />
      </header>
      <h1 className="mb-6 mt-8 text-2xl font-extrabold sm:text-3xl">식단표 관리</h1>

      {editable ? (
        <ManageClient
          daycare={{ id: daycare.id, name: daycare.name }}
          months={(await listMonths(env, daycare.id)).reverse()}
          today={todayKST()}
          editYm={ym && /^\d{4}-\d{2}$/.test(ym) ? ym : null}
        />
      ) : (
        <section className="max-w-md rounded-3xl border border-line bg-panel p-5 sm:p-6">
          <h2 className="text-lg font-extrabold">관리 비밀번호를 입력해 주세요</h2>
          <p className="mt-1 text-sm text-muted">어린이집을 만들 때 정한 비밀번호예요. 이 기기에서는 한 번만 입력하면 돼요.</p>
          <UnlockForm daycareId={daycare.id} />
        </section>
      )}

      <p className="mt-10 text-xs text-muted">
        공유 주소: <span className="select-all font-mono">/c/{daycare.id}</span> — 가족에게 이 주소를 알려주면 같은 식단을 볼 수 있어요.
      </p>
    </main>
  );
}
