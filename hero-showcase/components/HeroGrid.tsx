"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { HeroMiniCard } from "./HeroMiniCard";
import type { Hero } from "@/lib/types";

type SortMode = "random" | "name";

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function HeroGrid({ heroes }: { heroes: Hero[] }) {
  const [sortMode, setSortMode] = useState<SortMode>("random");
  const [randomOrder, setRandomOrder] = useState<Hero[]>([]);

  useEffect(() => {
    setRandomOrder(shuffled(heroes));
  }, [heroes]);

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

  const displayed =
    sortMode === "name"
      ? [...heroes].sort((a, b) => a.name.localeCompare(b.name, "ko"))
      : randomOrder;

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => { setSortMode("random"); setRandomOrder(shuffled(heroes)); }}
          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
            sortMode === "random"
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-transparent text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500"
          }`}
        >
          🔀 랜덤
        </button>
        <button
          onClick={() => setSortMode("name")}
          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
            sortMode === "name"
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-transparent text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500"
          }`}
        >
          가나다순
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {displayed.map((hero) => (
          <HeroMiniCard
            key={hero.id}
            id={hero.id}
            short_id={hero.short_id}
            name={hero.name}
            title={hero.title}
            rarity={hero.rarity}
            portrait_url={hero.portrait_url}
          />
        ))}
      </div>
    </>
  );
}
