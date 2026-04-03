import { supabase } from "@/lib/supabase";
import { HeroGrid } from "@/components/HeroGrid";
import type { Hero } from "@/lib/types";

export const revalidate = 0;

export default async function GalleryPage() {
  const { data, error } = await supabase
    .from("hs_heroes")
    .select("id, name, title, job, rarity, portrait_url, card_url, metadata, created_at")
    .order("created_at", { ascending: false });

  const heroes: Hero[] = (data as Hero[]) ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">영웅 갤러리</h1>
          {heroes.length > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              총 {heroes.length}명의 영웅
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400 mb-6">
          데이터를 불러오는 중 오류가 발생했습니다: {error.message}
        </div>
      )}

      <HeroGrid heroes={heroes} />
    </div>
  );
}
