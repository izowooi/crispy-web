"use client";

import type { Restaurant } from "@/types/restaurant";

const CATEGORY_COLORS: Record<string, string> = {
  "점심 식사": "bg-blue-100 text-blue-700",
  "회식": "bg-purple-100 text-purple-700",
  "디저트": "bg-pink-100 text-pink-700",
  "기타": "bg-gray-100 text-gray-700",
};

export default function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  const categoryColor = CATEGORY_COLORS[restaurant.category ?? ""] ?? "bg-gray-100 text-gray-700";

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
      <div className="flex items-start justify-between gap-2 mb-3">
        <h2 className="text-2xl font-bold text-gray-900">{restaurant.name}</h2>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {restaurant.category && (
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${categoryColor}`}>
              {restaurant.category}
            </span>
          )}
          {restaurant.verified && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">
              ✓ 검증됨
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        {restaurant.genre && (
          <div className="flex items-center gap-2">
            <span className="text-lg">🍽️</span>
            <span className="font-medium text-gray-800">{restaurant.genre}</span>
          </div>
        )}
        {restaurant.location && (
          <div className="flex items-center gap-2">
            <span className="text-lg">📍</span>
            <span>{restaurant.location}</span>
          </div>
        )}
        {restaurant.recommender && (
          <div className="flex items-center gap-2">
            <span className="text-lg">👤</span>
            <span>추천인: {restaurant.recommender}</span>
          </div>
        )}
        {restaurant.notes && (
          <div className="flex items-start gap-2">
            <span className="text-lg">📝</span>
            <span className="text-gray-500">{restaurant.notes}</span>
          </div>
        )}
        {restaurant.payco && (
          <div className="flex items-center gap-2">
            <span className="text-lg">💳</span>
            <span>페이코: {restaurant.payco}</span>
          </div>
        )}
        {restaurant.verifiers && (
          <div className="flex items-center gap-2">
            <span className="text-lg">✅</span>
            <span className="text-gray-500">검증인: {restaurant.verifiers}</span>
          </div>
        )}
      </div>

      {restaurant.review && (
        <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
          <p className="text-sm text-amber-900 whitespace-pre-line">{restaurant.review}</p>
        </div>
      )}

      {restaurant.link && (
        <a
          href={restaurant.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          네이버 지도에서 보기 →
        </a>
      )}
    </div>
  );
}
