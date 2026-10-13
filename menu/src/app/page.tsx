import { Search } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateDaycareForm } from "@/components/forms";
import { ThemeToggle } from "@/components/theme-toggle";
import { LAST_DAYCARE_COOKIE } from "@/lib/server/auth";
import { getDaycare, searchDaycares } from "@/lib/server/db";
import { getEnv } from "@/lib/server/env";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string; pick?: string }> }) {
  const { q = "", pick } = await searchParams;
  const env = await getEnv();
  const lastId = (await cookies()).get(LAST_DAYCARE_COOKIE)?.value;
  const last = lastId ? await getDaycare(env, lastId) : null;

  // 핵심 동선: 다시 열면 아무것도 누르지 않아도 마지막 어린이집의 오늘 식단으로 간다.
  if (last && !pick && !q) redirect(`/c/${last.id}`);

  const results = q ? await searchDaycares(env, q) : [];

  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 pt-5 sm:px-6 sm:pt-7">
      <header className="flex items-center justify-between">
        <span className="text-lg font-extrabold">◒ 우리 아기 식단</span>
        <ThemeToggle />
      </header>

      <section className="mb-8 mt-10 sm:mt-14">
        <p className="text-xs font-semibold tracking-[0.12em] text-muted">작은 하루, 든든한 한 끼</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">오늘은 뭘 먹을까요?</h1>
        <p className="mt-3 leading-relaxed text-muted">
          어린이집에서 받은 월간 식단표 사진을 한 번 올리면,
          <br className="hidden sm:block" /> 다음부터는 앱만 열어도 오늘의 간식과 점심이 바로 보여요.
        </p>
      </section>

      {last && (
        <Link
          href={`/c/${last.id}`}
          className="mb-6 flex items-center justify-between rounded-3xl bg-accent px-5 py-4 font-bold text-accent-ink"
        >
          <span>{last.name} 식단 계속 보기</span>
          <span aria-hidden>→</span>
        </Link>
      )}

      <section className="rounded-3xl border border-line bg-panel p-5 sm:p-6">
        <h2 className="text-lg font-extrabold">어린이집 찾기</h2>
        <form className="mt-3 flex gap-2" action="/">
          <input type="hidden" name="pick" value="1" />
          <input
            name="q"
            defaultValue={q}
            placeholder="어린이집 이름"
            className="min-w-0 flex-1 rounded-2xl border border-line bg-canvas px-4 py-3"
            aria-label="어린이집 이름"
          />
          <button type="submit" className="grid w-12 place-items-center rounded-2xl bg-panel-muted" aria-label="검색">
            <Search size={18} aria-hidden />
          </button>
        </form>
        {q && (
          <ul className="mt-3 divide-y divide-line">
            {results.length === 0 && <li className="py-3 text-sm text-muted">&lsquo;{q}&rsquo;에 해당하는 어린이집이 없어요.</li>}
            {results.map((r) => (
              <li key={r.id}>
                <Link href={`/c/${r.id}`} className="flex items-center justify-between py-3 font-semibold">
                  {r.name}
                  <span className="text-xs text-muted">/c/{r.id}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 rounded-3xl border border-line bg-panel p-5 sm:p-6">
        <h2 className="text-lg font-extrabold">새 어린이집 만들기</h2>
        <p className="mt-1 text-sm text-muted">관리 비밀번호는 식단표를 올리거나 고칠 때만 필요해요. 보기는 누구나 할 수 있어요.</p>
        <CreateDaycareForm />
      </section>
    </main>
  );
}
