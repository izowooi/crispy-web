import Link from "next/link";
import { HeroMiniCard } from "./HeroMiniCard";
import type { Hero } from "@/lib/types";

export function HeroGrid({ heroes }: { heroes: Hero[] }) {
  if (heroes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-6xl mb-4">🏰</div>
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
          아직 등록된 영웅이 없습니다
        </h2>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
          첫 번째 영웅 카드를 업로드해보세요
        </p>
        <Link
          href="/upload"
          className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition-colors"
        >
          영웅 등록하기
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {heroes.map((hero) => (
        <HeroMiniCard
          key={hero.id}
          id={hero.id}
          name={hero.name}
          title={hero.title}
          rarity={hero.rarity}
          portrait_url={hero.portrait_url}
        />
      ))}
    </div>
  );
}
