import { loadKakaoMaps } from "./kakaoLoader";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type GeocodeResult = {
  /** Road-name address when available (e.g. "서울특별시 종로구 사직로 161"). */
  roadAddress: string | null;
  /** Lot-number address (지번). */
  jibunAddress: string | null;
  /** Whichever is more useful — prefer road, fall back to jibun. */
  best: string | null;
};

/**
 * Turn lat/lng into a Korean street address via Kakao's reverse-geocoder.
 * Resolves to all-null values if the lookup fails (keeps callers simple).
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
  try {
    const kakao = await loadKakaoMaps();
    const geocoder = new kakao.services.Geocoder();

    return await new Promise<GeocodeResult>((resolve) => {
      geocoder.coord2Address(lng, lat, (result: any[], status: string) => {
        if (status !== kakao.services.Status.OK || !result || result.length === 0) {
          resolve({ roadAddress: null, jibunAddress: null, best: null });
          return;
        }
        const first = result[0];
        const road: string | null = first.road_address?.address_name ?? null;
        const jibun: string | null = first.address?.address_name ?? null;
        resolve({ roadAddress: road, jibunAddress: jibun, best: road || jibun });
      });
    });
  } catch {
    return { roadAddress: null, jibunAddress: null, best: null };
  }
}
