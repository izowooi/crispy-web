import type { Place, PlaceInput } from "@/types/place";

// Client-side CRUD helpers that go through our /api/places route.
// The route handles Supabase access so we never ship the anon key in the
// client bundle if someone later tightens the env exposure.

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${text ? ` – ${text}` : ""}`);
  }
  return (await res.json()) as T;
}

export async function listPlaces(): Promise<Place[]> {
  const res = await fetch("/api/places", { cache: "no-store" });
  const { places } = await handle<{ places: Place[] }>(res);
  return places;
}

export async function createPlace(input: PlaceInput): Promise<Place> {
  const res = await fetch("/api/places", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const { place } = await handle<{ place: Place }>(res);
  return place;
}

export async function updatePlace(id: string, patch: Partial<PlaceInput>): Promise<Place> {
  const res = await fetch(`/api/places/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
  const { place } = await handle<{ place: Place }>(res);
  return place;
}

export async function deletePlace(id: string): Promise<void> {
  const res = await fetch(`/api/places/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 204) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${text ? ` – ${text}` : ""}`);
  }
}
