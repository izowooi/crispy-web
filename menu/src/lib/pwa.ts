export const THEME_COLOR = "#426550";
export const BACKGROUND_COLOR = "#f7f7ef";

const ICONS = [
  { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
  { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
  { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
] as const;

export type WebManifest = {
  id: string;
  name: string;
  short_name: string;
  description: string;
  lang: string;
  start_url: string;
  scope: string;
  display: "standalone";
  orientation: "portrait";
  background_color: string;
  theme_color: string;
  icons: typeof ICONS;
};

/**
 * 어린이집마다 manifest를 따로 만든다. start_url이 `/c/<id>`로 고정되므로, 홈 화면에서 앱을 열 때
 * 쿠키(bm_last)가 없는 환경(iOS 홈 화면 앱은 Safari와 쿠키가 분리된다)에서도 바로 그 어린이집이 열린다.
 */
export function buildManifest(daycare?: { id: string; name: string }): WebManifest {
  const base = {
    description: "어린이집 월간 식단표를 올리면 오늘의 간식과 점심을 바로 보여줍니다.",
    lang: "ko",
    scope: "/",
    display: "standalone" as const,
    orientation: "portrait" as const,
    background_color: BACKGROUND_COLOR,
    theme_color: THEME_COLOR,
    icons: ICONS,
  };
  if (!daycare) {
    return { ...base, id: "/", name: "우리 아기 식단", short_name: "아기 식단", start_url: "/" };
  }
  return {
    ...base,
    id: `/c/${daycare.id}`,
    name: `${daycare.name} 식단`,
    short_name: daycare.name.slice(0, 12),
    start_url: `/c/${daycare.id}`,
  };
}

export const MANIFEST_HEADERS = {
  "content-type": "application/manifest+json; charset=utf-8",
  "cache-control": "public, max-age=0, must-revalidate",
};

/** iOS 홈 화면 앱은 기기 화면 크기에 정확히 맞는 시작 이미지가 없으면 하얀 화면이 먼저 뜬다. */
export const SPLASH_SCREENS: readonly (readonly [width: number, height: number, scale: number])[] = [
  [440, 956, 3], [402, 874, 3], [430, 932, 3], [393, 852, 3], [390, 844, 3],
  [375, 812, 3], [414, 896, 3], [414, 896, 2], [414, 736, 3], [375, 667, 2],
  [834, 1194, 2], [834, 1112, 2], [820, 1180, 2], [810, 1080, 2], [768, 1024, 2], [744, 1133, 2], [1024, 1366, 2],
];

export function splashFile([width, height, scale]: readonly [number, number, number]): string {
  return `/splash/splash-${width * scale}x${height * scale}.png`;
}

export function appleWebApp(title: string) {
  return {
    capable: true,
    title,
    statusBarStyle: "default" as const,
    startupImage: SPLASH_SCREENS.map((screen) => ({
      url: splashFile(screen),
      media: `(device-width: ${screen[0]}px) and (device-height: ${screen[1]}px) and (-webkit-device-pixel-ratio: ${screen[2]}) and (orientation: portrait)`,
    })),
  };
}

/** Next.js는 mobile-web-app-capable만 내보낸다. iOS 16 이하 Safari는 apple- 접두어 태그만 읽는다. */
export const LEGACY_IOS_WEB_APP_META = { "apple-mobile-web-app-capable": "yes" };
