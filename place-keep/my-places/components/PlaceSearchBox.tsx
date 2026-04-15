"use client";

import { useEffect, useRef, useState } from "react";
import { loadKakaoMaps } from "@/lib/kakaoLoader";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type SearchPick = {
  lat: number;
  lng: number;
  place_name: string;
  address: string;
  category?: string;
};

type Props = {
  onPick: (pick: SearchPick) => void;
};

type KakaoResult = {
  y: string; // lat
  x: string; // lng
  place_name: string;
  address_name: string;
  road_address_name?: string;
  category_group_name?: string;
};

export default function PlaceSearchBox({ onPick }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KakaoResult[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const servicesRef = useRef<any>(null);

  useEffect(() => {
    loadKakaoMaps()
      .then((kakao) => {
        servicesRef.current = new kakao.services.Places();
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const runSearch = () => {
    const trimmed = query.trim();
    if (!trimmed || !servicesRef.current) return;
    servicesRef.current.keywordSearch(trimmed, (data: KakaoResult[], status: string) => {
      if (status === "OK") {
        setResults(data.slice(0, 8));
        setOpen(true);
      } else {
        setResults([]);
        setOpen(true);
      }
    });
  };

  const handlePick = (r: KakaoResult) => {
    onPick({
      lat: Number(r.y),
      lng: Number(r.x),
      place_name: r.place_name,
      address: r.road_address_name || r.address_name,
      category: r.category_group_name,
    });
    setOpen(false);
    setQuery(r.place_name);
  };

  return (
    <div className="fixed left-1/2 top-3 z-10 w-[min(92vw,420px)] -translate-x-1/2 sm:top-5" data-testid="search-box">
      <div className="flex overflow-hidden rounded-full bg-white shadow-md ring-1 ring-black/5">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              runSearch();
            }
          }}
          placeholder="장소 / 주소 검색"
          className="flex-1 bg-transparent px-4 py-2.5 text-sm outline-none"
        />
        <button
          type="button"
          onClick={runSearch}
          className="px-4 text-sm text-gray-500 hover:text-gray-700"
          aria-label="검색"
        >
          🔍
        </button>
      </div>

      {error ? (
        <div className="mt-2 rounded-lg bg-white px-3 py-2 text-xs text-red-600 shadow">
          {error}
        </div>
      ) : null}

      {open && results.length > 0 ? (
        <ul className="mt-2 max-h-72 overflow-auto rounded-xl bg-white shadow-md ring-1 ring-black/5">
          {results.map((r, i) => (
            <li key={`${r.place_name}-${i}`}>
              <button
                type="button"
                onClick={() => handlePick(r)}
                className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
              >
                <div className="font-medium">{r.place_name}</div>
                <div className="text-xs text-gray-500">
                  {r.road_address_name || r.address_name}
                  {r.category_group_name ? ` · ${r.category_group_name}` : ""}
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {open && results.length === 0 ? (
        <div className="mt-2 rounded-lg bg-white px-3 py-2 text-xs text-gray-500 shadow">
          검색 결과가 없습니다
        </div>
      ) : null}
    </div>
  );
}
