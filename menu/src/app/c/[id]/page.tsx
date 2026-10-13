import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MenuViewer } from "@/components/menu-viewer";
import { isIsoDate, todayKST } from "@/lib/dates";
import { getDaycare, listMonths } from "@/lib/server/db";
import { getEnv } from "@/lib/server/env";
import { canEdit } from "@/lib/server/session";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string; view?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const daycare = await getDaycare(await getEnv(), id);
  return { title: daycare ? `${daycare.name} 식단 · 우리 아기 식단` : "우리 아기 식단" };
}

export default async function DaycarePage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const env = await getEnv();
  const daycare = await getDaycare(env, id);
  if (!daycare) notFound();

  const [months, editable] = await Promise.all([listMonths(env, daycare.id), canEdit(daycare)]);
  const today = todayKST();
  const date = sp.date && isIsoDate(sp.date) ? sp.date : today;

  return (
    <MenuViewer
      key={`${daycare.id}-${date}`}
      daycare={{ id: daycare.id, name: daycare.name }}
      months={months}
      today={today}
      initialDate={date}
      initialView={sp.view === "month" ? "month" : "day"}
      editable={editable}
    />
  );
}
