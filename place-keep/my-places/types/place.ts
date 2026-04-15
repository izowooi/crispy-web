export type Place = {
  id: string;
  short_id: string;
  title: string; // ≤ 50 chars
  caption: string | null;
  lat: number;
  lng: number;
  address: string | null;
  place_name: string | null;
  category: string | null;
  visited_at: string | null; // ISO date (YYYY-MM-DD)
  photo_url: string | null;
  created_at: string;
  updated_at: string;
};

export type PlaceInput = {
  title: string;
  caption?: string | null;
  lat: number;
  lng: number;
  address?: string | null;
  place_name?: string | null;
  category?: string | null;
  visited_at?: string | null;
};

export const TITLE_MAX = 50;
