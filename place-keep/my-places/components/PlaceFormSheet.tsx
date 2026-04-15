"use client";

import { useEffect, useState } from "react";
import type { Place, PlaceInput } from "@/types/place";
import { TITLE_MAX } from "@/types/place";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  initial: Partial<Place> & { lat: number; lng: number };
  saving?: boolean;
  onCancel: () => void;
  onSubmit: (input: PlaceInput) => void | Promise<void>;
};

export default function PlaceFormSheet({ open, mode, initial, saving, onCancel, onSubmit }: Props) {
  const [title, setTitle] = useState(initial.title ?? "");
  const [caption, setCaption] = useState(initial.caption ?? "");
  const [address, setAddress] = useState(initial.address ?? "");
  const [placeName, setPlaceName] = useState(initial.place_name ?? "");
  const [category, setCategory] = useState(initial.category ?? "");
  const [visitedAt, setVisitedAt] = useState(initial.visited_at ?? "");

  // Reset whenever the sheet reopens with new initial data.
  useEffect(() => {
    if (!open) return;
    setTitle(initial.title ?? "");
    setCaption(initial.caption ?? "");
    setAddress(initial.address ?? "");
    setPlaceName(initial.place_name ?? "");
    setCategory(initial.category ?? "");
    setVisitedAt(initial.visited_at ?? "");
  }, [open, initial]);

  if (!open) return null;

  const trimmedTitle = title.trim();
  const canSubmit = trimmedTitle.length > 0 && trimmedTitle.length <= TITLE_MAX && !saving;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      title: trimmedTitle,
      caption: caption.trim() || null,
      address: address.trim() || null,
      place_name: placeName.trim() || null,
      category: category.trim() || null,
      visited_at: visitedAt || null,
      lat: initial.lat,
      lng: initial.lng,
    });
  };

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center sheet-backdrop" role="dialog" aria-modal="true">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-xl sm:mb-6 sm:rounded-2xl"
        data-testid="place-form"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {mode === "create" ? "새 장소 저장" : "장소 수정"}
          </h2>
          <button type="button" onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700">
            닫기
          </button>
        </div>

        <label className="mb-3 block">
          <span className="mb-1 flex items-center justify-between text-sm font-medium text-gray-700">
            제목 <span className="text-xs text-gray-400" data-testid="title-counter">{title.length}/{TITLE_MAX}</span>
          </span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
            maxLength={TITLE_MAX}
            required
            placeholder="예: 분위기 좋은 한옥 카페"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            data-testid="title-input"
          />
        </label>

        <label className="mb-3 block">
          <span className="mb-1 block text-sm font-medium text-gray-700">상세 메모</span>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={5}
            placeholder="무엇이 좋았는지, 누구와 갔는지, 뭘 먹었는지 자유롭게"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            data-testid="caption-input"
          />
        </label>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">방문일</span>
            <input
              type="date"
              value={visitedAt}
              onChange={(e) => setVisitedAt(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              data-testid="visited-at-input"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">카테고리</span>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="식당 / 카페 / 관광 등"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              data-testid="category-input"
            />
          </label>
        </div>

        <label className="mb-3 block">
          <span className="mb-1 block text-sm font-medium text-gray-700">상호명 (선택)</span>
          <input
            type="text"
            value={placeName}
            onChange={(e) => setPlaceName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </label>

        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium text-gray-700">주소 (선택)</span>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </label>

        <div className="mb-4 text-xs text-gray-500" data-testid="form-location-summary">
          <div>📍 {address.trim() || placeName.trim() || "선택한 지도 위치"}</div>
          <div className="mt-0.5 text-[10px] text-gray-400">
            좌표 {initial.lat.toFixed(5)}, {initial.lng.toFixed(5)}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            data-testid="form-submit"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}
