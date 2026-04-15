"use client";

import { useEffect, useRef, useState } from "react";
import { reverseGeocode } from "@/lib/geocoder";

type Props = {
  /** Current map center as reported by the map component (updates on pan/zoom idle). */
  center: { lat: number; lng: number } | null;
  onCancel: () => void;
  onConfirm: (picked: { lat: number; lng: number; address: string | null }) => void;
  /** Called when the "내 위치" button is pressed with a resolved position. */
  onUseMyLocation: (coords: { lat: number; lng: number }) => void;
};

export default function LocationPicker({ center, onCancel, onConfirm, onUseMyLocation }: Props) {
  const [address, setAddress] = useState<string | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  // Guard against out-of-order geocode responses.
  const reqIdRef = useRef(0);

  // Re-geocode whenever the map stops moving at a new center.
  useEffect(() => {
    if (!center) {
      setAddress(null);
      return;
    }
    const myId = ++reqIdRef.current;
    setAddressLoading(true);
    reverseGeocode(center.lat, center.lng)
      .then((r) => {
        if (reqIdRef.current !== myId) return;
        setAddress(r.best);
      })
      .finally(() => {
        if (reqIdRef.current === myId) setAddressLoading(false);
      });
  }, [center?.lat, center?.lng]);

  const handleGps = () => {
    if (!("geolocation" in navigator)) {
      setGpsError("이 브라우저는 위치 정보를 지원하지 않아요");
      return;
    }
    setGpsBusy(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsBusy(false);
        onUseMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        setGpsBusy(false);
        setGpsError(
          err.code === err.PERMISSION_DENIED
            ? "위치 권한이 거부됐어요. 브라우저 설정에서 허용해주세요"
            : "현재 위치를 가져오지 못했어요"
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  };

  const handleConfirm = () => {
    if (!center) return;
    onConfirm({ lat: center.lat, lng: center.lng, address });
  };

  return (
    <>
      {/* Top banner */}
      <div
        className="pointer-events-auto fixed inset-x-0 top-0 z-20 flex items-center justify-between gap-2 bg-black/70 px-4 py-3 text-white backdrop-blur-sm"
        data-testid="picker-banner"
      >
        <div className="text-sm">
          <div className="font-medium">위치 선택</div>
          <div className="text-xs text-white/70">지도를 움직여 가운데 핀을 원하는 위치에 맞춰주세요</div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20"
          aria-label="취소"
          data-testid="picker-cancel"
        >
          취소
        </button>
      </div>

      {/* Center crosshair — pointer-events-none so it never blocks the map */}
      <div
        className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center"
        data-testid="picker-pin"
        aria-hidden="true"
      >
        <div className="relative -translate-y-4">
          <svg
            width="40"
            height="48"
            viewBox="0 0 40 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-lg"
          >
            <path
              d="M20 2C10.6 2 3 9.6 3 19c0 11.4 14.3 25.6 16.1 27.4.5.5 1.3.5 1.8 0C22.7 44.6 37 30.4 37 19 37 9.6 29.4 2 20 2Z"
              fill="#ef4444"
              stroke="white"
              strokeWidth="2"
            />
            <circle cx="20" cy="19" r="6" fill="white" />
          </svg>
          {/* subtle shadow directly under the pin */}
          <div className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-2 h-1.5 w-4 rounded-full bg-black/30 blur-[2px]" />
        </div>
      </div>

      {/* Bottom sheet */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex justify-center px-0 sm:p-4">
        <div className="w-full max-w-lg rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl" data-testid="picker-sheet">
          <div className="mb-3">
            <div className="text-xs text-gray-500">선택한 위치</div>
            <div className="mt-0.5 min-h-[1.5rem] text-sm font-medium text-gray-900" data-testid="picker-address">
              {addressLoading ? (
                <span className="text-gray-400">주소 찾는 중...</span>
              ) : address ? (
                address
              ) : (
                <span className="text-gray-400">주소 정보 없음</span>
              )}
            </div>
          </div>

          {gpsError ? (
            <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{gpsError}</div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleGps}
              disabled={gpsBusy}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
              data-testid="picker-gps"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <line x1="12" y1="2" x2="12" y2="5" />
                <line x1="12" y1="19" x2="12" y2="22" />
                <line x1="2" y1="12" x2="5" y2="12" />
                <line x1="19" y1="12" x2="22" y2="12" />
              </svg>
              {gpsBusy ? "위치 확인 중..." : "내 위치"}
            </button>

            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!center}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                data-testid="picker-confirm"
              >
                이 위치로 저장
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
