"use client";

import { useState } from "react";
import RestaurantCard from "@/components/RestaurantCard";
import type { Restaurant } from "@/types/restaurant";

const CATEGORIES = ["전체", "점심 식사", "회식", "디저트", "기타"];

export default function HomePage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [category, setCategory] = useState("전체");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickRandom() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ random: "true" });
      if (category !== "전체") params.append("category", category);
      const res = await fetch(`/api/restaurants?${params}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "오류가 발생했습니다");
        setRestaurant(null);
        return;
      }
      const data: Restaurant = await res.json();
      setRestaurant(data);
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">오늘 뭐 먹지? 🤔</h1>
        <p className="text-gray-500 text-sm">판교 직장인들이 추천하는 맛집을 랜덤으로 뽑아드려요</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">카테고리 선택</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  category === cat
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={pickRandom}
          disabled={loading}
          className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-xl text-lg font-bold transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="animate-spin">🎲</span> 뽑는 중...
            </>
          ) : (
            <>🎲 랜덤 맛집 추천</>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm text-center">
          {error}
        </div>
      )}

      {restaurant && !loading && <RestaurantCard restaurant={restaurant} />}

      {!restaurant && !loading && !error && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-5xl mb-3">🍱</p>
          <p className="text-sm">버튼을 눌러 오늘의 맛집을 추천받으세요!</p>
        </div>
      )}
    </div>
  );
}
