import Link from "next/link";
import Image from "next/image";
import type { Hero } from "@/lib/types";

const RARITY_CONFIG: Record<string, { label: string; className: string }> = {
  common:    { label: "커먼",  className: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600" },
  rare:      { label: "레어",  className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-700" },
  hero:      { label: "영웅",  className: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 border border-purple-200 dark:border-purple-700" },
  legendary: { label: "전설",  className: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 border border-orange-200 dark:border-orange-700" },
  mythic:    { label: "신화",  className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border border-red-200 dark:border-red-700" },
};

type HeroMiniCardProps = Pick<Hero, "id" | "short_id" | "name" | "title" | "rarity" | "portrait_url">;

export function HeroMiniCard({ id, short_id, name, title, rarity, portrait_url }: HeroMiniCardProps) {
  const rConfig = RARITY_CONFIG[rarity] ?? RARITY_CONFIG.common;

  return (
    <Link href={`/heroes/${short_id ?? id}`} className="group block">
      <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
        {/* Portrait */}
        <div className="relative aspect-[4/5] bg-gray-100 dark:bg-gray-700 overflow-hidden">
          {portrait_url ? (
            <Image
              src={portrait_url}
              alt={name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-16 h-16 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 line-clamp-1">{name}</p>
          {title && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{title}</p>
          )}
          <div className="mt-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${rConfig.className}`}>
              {rConfig.label}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
