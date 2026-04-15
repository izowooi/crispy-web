"use client";

import { useEffect, useImperativeHandle, useRef, forwardRef } from "react";
import { loadKakaoMaps } from "@/lib/kakaoLoader";
import type { Place } from "@/types/place";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type KakaoMapHandle = {
  panTo: (lat: number, lng: number) => void;
  getCenter: () => { lat: number; lng: number } | null;
};

type Props = {
  places: Place[];
  initialCenter: { lat: number; lng: number };
  onMarkerClick: (place: Place) => void;
  onReady?: () => void;
  onError?: (message: string) => void;
  /**
   * Fires (debounced) whenever the map stops moving. Used by the LocationPicker
   * to drive reverse-geocoding while the crosshair mode is active.
   */
  onIdle?: (center: { lat: number; lng: number }) => void;
};

const KakaoMap = forwardRef<KakaoMapHandle, Props>(function KakaoMap(
  { places, initialCenter, onMarkerClick, onReady, onError, onIdle },
  ref
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const onMarkerClickRef = useRef(onMarkerClick);
  onMarkerClickRef.current = onMarkerClick;
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  useImperativeHandle(ref, () => ({
    panTo(lat: number, lng: number) {
      if (!mapRef.current || !window.kakao) return;
      const pos = new window.kakao.maps.LatLng(lat, lng);
      mapRef.current.panTo(pos);
    },
    getCenter() {
      if (!mapRef.current) return null;
      const c = mapRef.current.getCenter();
      return { lat: c.getLat(), lng: c.getLng() };
    },
  }));

  // Initialise the map exactly once.
  useEffect(() => {
    let cancelled = false;
    loadKakaoMaps()
      .then((kakao) => {
        if (cancelled || !containerRef.current) return;
        const map = new kakao.Map(containerRef.current, {
          center: new kakao.LatLng(initialCenter.lat, initialCenter.lng),
          level: 5,
        });
        mapRef.current = map;
        // Nudge the map to recompute its size after layout.
        setTimeout(() => map.relayout(), 0);

        // `idle` fires after pan/zoom settles — perfect for reverse-geocoding.
        // NOTE: loadKakaoMaps resolves with `window.kakao.maps`, so the event
        // namespace is `kakao.event` here, NOT `kakao.maps.event`.
        kakao.event.addListener(map, "idle", () => {
          if (!onIdleRef.current) return;
          const c = map.getCenter();
          onIdleRef.current({ lat: c.getLat(), lng: c.getLng() });
        });

        // Emit the initial center so the picker has something to show before
        // the first user pan.
        {
          const c = map.getCenter();
          onIdleRef.current?.({ lat: c.getLat(), lng: c.getLng() });
        }

        onReady?.();
      })
      .catch((err: Error) => {
        if (!cancelled) onError?.(err.message);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reconcile markers whenever `places` changes.
  useEffect(() => {
    const kakao = window.kakao;
    if (!kakao || !mapRef.current) return;

    const existing = markersRef.current;
    const nextIds = new Set(places.map((p) => p.id));

    // Remove stale markers
    for (const [id, marker] of existing) {
      if (!nextIds.has(id)) {
        marker.setMap(null);
        existing.delete(id);
      }
    }

    // Add new markers
    for (const place of places) {
      if (existing.has(place.id)) continue;
      const pos = new kakao.maps.LatLng(place.lat, place.lng);
      const marker = new kakao.maps.Marker({ position: pos });
      marker.setMap(mapRef.current);
      kakao.maps.event.addListener(marker, "click", () => {
        onMarkerClickRef.current(place);
      });
      existing.set(place.id, marker);
    }
  }, [places]);

  return <div ref={containerRef} className="map-root" data-testid="kakao-map" />;
});

export default KakaoMap;
