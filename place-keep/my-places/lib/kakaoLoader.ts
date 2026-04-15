// Single-shot loader for the Kakao Maps JavaScript SDK. Ensures the script is
// injected exactly once and exposes a Promise that resolves with the fully
// initialised `kakao.maps` namespace.
//
// Docs: https://apis.map.kakao.com/web/guide/

/* eslint-disable @typescript-eslint/no-explicit-any */

declare global {
  interface Window {
    kakao?: any;
  }
}

type KakaoMaps = any;

let loadPromise: Promise<KakaoMaps> | null = null;

export function loadKakaoMaps(): Promise<KakaoMaps> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Kakao Maps can only be loaded in the browser"));
  }

  if (window.kakao && window.kakao.maps && window.kakao.maps.Map) {
    return Promise.resolve(window.kakao.maps);
  }

  if (loadPromise) return loadPromise;

  const appkey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
  if (!appkey) {
    return Promise.reject(
      new Error("NEXT_PUBLIC_KAKAO_MAP_KEY is not set. See .env.local.example.")
    );
  }

  loadPromise = new Promise<KakaoMaps>((resolve, reject) => {
    const existing = document.getElementById("kakao-maps-sdk") as HTMLScriptElement | null;
    const onReady = () => {
      if (!window.kakao) {
        reject(new Error("Kakao SDK failed to attach to window"));
        return;
      }
      window.kakao.maps.load(() => resolve(window.kakao.maps));
    };

    if (existing) {
      existing.addEventListener("load", onReady, { once: true });
      existing.addEventListener("error", () => reject(new Error("Kakao SDK script failed to load")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.id = "kakao-maps-sdk";
    script.async = true;
    script.defer = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appkey}&libraries=services&autoload=false`;
    script.onload = onReady;
    script.onerror = () => reject(new Error("Kakao SDK script failed to load"));
    document.head.appendChild(script);
  });

  return loadPromise;
}

export function isKakaoConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_KAKAO_MAP_KEY);
}
