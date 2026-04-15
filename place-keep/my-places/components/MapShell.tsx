"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import KakaoMap, { type KakaoMapHandle } from "./KakaoMap";
import PlaceDetailSheet from "./PlaceDetailSheet";
import PlaceFormSheet from "./PlaceFormSheet";
import AddPlaceFab from "./AddPlaceFab";
import PlaceSearchBox, { type SearchPick } from "./PlaceSearchBox";
import type { Place, PlaceInput } from "@/types/place";
import { createPlace, deletePlace, listPlaces, updatePlace } from "@/lib/places";

// Seoul City Hall as a pleasant default; overwritten by localStorage if available.
const DEFAULT_CENTER = { lat: 37.5666102, lng: 126.9783881 };
const LAST_CENTER_KEY = "my-places:last-center";

type Mode =
  | { kind: "idle" }
  | { kind: "detail"; place: Place }
  | { kind: "create"; seed: { lat: number; lng: number; place_name?: string; address?: string; category?: string } }
  | { kind: "edit"; place: Place };

export default function MapShell() {
  const mapRef = useRef<KakaoMapHandle>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [mode, setMode] = useState<Mode>({ kind: "idle" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [initialCenter, setInitialCenter] = useState(DEFAULT_CENTER);
  const [focusedShortId, setFocusedShortId] = useState<string | null>(null);

  // Resolve initial center from localStorage on first mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(LAST_CENTER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { lat: number; lng: number };
        if (Number.isFinite(parsed.lat) && Number.isFinite(parsed.lng)) {
          setInitialCenter(parsed);
        }
      }
    } catch {}
    // Share URL: /?id=<short_id>
    const url = new URL(window.location.href);
    const id = url.searchParams.get("id");
    if (id) setFocusedShortId(id);
  }, []);

  // Load places on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await listPlaces();
        if (!cancelled) setPlaces(rows);
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          setBanner(`데이터를 불러오지 못했습니다: ${msg}`);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Once places load + map is ready + we have a focused short_id, pan to it.
  useEffect(() => {
    if (!focusedShortId) return;
    const hit = places.find((p) => p.short_id === focusedShortId);
    if (hit) {
      mapRef.current?.panTo(hit.lat, hit.lng);
      setMode({ kind: "detail", place: hit });
      setFocusedShortId(null);
    }
  }, [focusedShortId, places]);

  const handleAdd = useCallback(() => {
    const center = mapRef.current?.getCenter() ?? initialCenter;
    setMode({ kind: "create", seed: center });
  }, [initialCenter]);

  const handleSearchPick = useCallback((pick: SearchPick) => {
    mapRef.current?.panTo(pick.lat, pick.lng);
    setMode({
      kind: "create",
      seed: {
        lat: pick.lat,
        lng: pick.lng,
        place_name: pick.place_name,
        address: pick.address,
        category: pick.category,
      },
    });
  }, []);

  const handleSubmit = useCallback(
    async (input: PlaceInput) => {
      setSaving(true);
      try {
        if (mode.kind === "create") {
          const created = await createPlace(input);
          setPlaces((prev) => [created, ...prev]);
          setMode({ kind: "detail", place: created });
        } else if (mode.kind === "edit") {
          const updated = await updatePlace(mode.place.id, input);
          setPlaces((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          setMode({ kind: "detail", place: updated });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setBanner(`저장 실패: ${msg}`);
      } finally {
        setSaving(false);
      }
    },
    [mode]
  );

  const handleDelete = useCallback(async (place: Place) => {
    if (typeof window !== "undefined" && !window.confirm(`"${place.title}"를 삭제할까요?`)) return;
    setDeleting(true);
    try {
      await deletePlace(place.id);
      setPlaces((prev) => prev.filter((p) => p.id !== place.id));
      setMode({ kind: "idle" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setBanner(`삭제 실패: ${msg}`);
    } finally {
      setDeleting(false);
    }
  }, []);

  const persistCenter = () => {
    const c = mapRef.current?.getCenter();
    if (!c || typeof window === "undefined") return;
    window.localStorage.setItem(LAST_CENTER_KEY, JSON.stringify(c));
  };

  return (
    <div className="relative h-full w-full" onMouseLeave={persistCenter}>
      <KakaoMap
        ref={mapRef}
        places={places}
        initialCenter={initialCenter}
        onMarkerClick={(place) => setMode({ kind: "detail", place })}
        onError={(msg) => setBanner(`지도 로드 실패: ${msg}`)}
      />

      <PlaceSearchBox onPick={handleSearchPick} />

      <AddPlaceFab onClick={handleAdd} />

      {mode.kind === "detail" ? (
        <PlaceDetailSheet
          place={mode.place}
          onClose={() => setMode({ kind: "idle" })}
          onEdit={(place) => setMode({ kind: "edit", place })}
          onDelete={handleDelete}
          deleting={deleting}
        />
      ) : null}

      <PlaceFormSheet
        open={mode.kind === "create" || mode.kind === "edit"}
        mode={mode.kind === "edit" ? "edit" : "create"}
        initial={
          mode.kind === "edit"
            ? mode.place
            : mode.kind === "create"
            ? { lat: mode.seed.lat, lng: mode.seed.lng, place_name: mode.seed.place_name ?? null, address: mode.seed.address ?? null, category: mode.seed.category ?? null }
            : { lat: DEFAULT_CENTER.lat, lng: DEFAULT_CENTER.lng }
        }
        saving={saving}
        onCancel={() => setMode({ kind: "idle" })}
        onSubmit={handleSubmit}
      />

      {banner ? (
        <div
          className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-lg bg-black/80 px-4 py-2 text-sm text-white shadow-lg"
          data-testid="banner"
        >
          <span>{banner}</span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="ml-3 text-white/70 hover:text-white"
            aria-label="알림 닫기"
          >
            ✕
          </button>
        </div>
      ) : null}
    </div>
  );
}
