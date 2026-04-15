"use client";

import type { Place } from "@/types/place";

type Props = {
  place: Place | null;
  onClose: () => void;
  onEdit: (place: Place) => void;
  onDelete: (place: Place) => void | Promise<void>;
  deleting?: boolean;
};

export default function PlaceDetailSheet({ place, onClose, onEdit, onDelete, deleting }: Props) {
  if (!place) return null;

  const shareHref = typeof window === "undefined" ? "#" : `${window.location.origin}/?id=${place.short_id}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareHref);
    } catch {
      window.prompt("공유 링크", shareHref);
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 flex justify-center px-0 sm:p-4" data-testid="place-detail">
      <div className="w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold" data-testid="detail-title">
              {place.title}
            </h2>
            {place.place_name ? (
              <p className="truncate text-xs text-gray-500">{place.place_name}</p>
            ) : null}
          </div>
          <button onClick={onClose} aria-label="닫기" className="shrink-0 text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        {place.caption ? (
          <p className="mb-3 whitespace-pre-wrap text-sm leading-6 text-gray-800" data-testid="detail-caption">
            {place.caption}
          </p>
        ) : (
          <p className="mb-3 text-sm italic text-gray-400">상세 메모 없음</p>
        )}

        <dl className="mb-4 grid grid-cols-2 gap-y-1 text-xs text-gray-600">
          {place.visited_at ? (
            <>
              <dt className="text-gray-400">방문일</dt>
              <dd>{place.visited_at}</dd>
            </>
          ) : null}
          {place.category ? (
            <>
              <dt className="text-gray-400">카테고리</dt>
              <dd>{place.category}</dd>
            </>
          ) : null}
          {place.address ? (
            <>
              <dt className="text-gray-400">주소</dt>
              <dd className="truncate">{place.address}</dd>
            </>
          ) : null}
          <dt className="text-gray-400">좌표</dt>
          <dd>
            {place.lat.toFixed(5)}, {place.lng.toFixed(5)}
          </dd>
        </dl>

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={copyLink}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
            title={shareHref}
          >
            공유 링크 복사
          </button>
          <button
            type="button"
            onClick={() => onDelete(place)}
            disabled={deleting}
            className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            data-testid="detail-delete"
          >
            {deleting ? "삭제 중..." : "삭제"}
          </button>
          <button
            type="button"
            onClick={() => onEdit(place)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            data-testid="detail-edit"
          >
            편집
          </button>
        </div>
      </div>
    </div>
  );
}
