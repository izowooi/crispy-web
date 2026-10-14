// baby-menu service worker.
// 이 앱의 모든 화면은 "오늘" 기준 동적 페이지라서 HTML을 캐시해 먼저 보여주면 어제 식단이 뜬다.
// 그래서 페이지는 항상 네트워크로 가져오고, 인터넷이 없을 때만 /offline(public/offline.html)을 보여준다.
// 캐시는 내용이 바뀌지 않는 정적 파일(/_next/static, 아이콘)에만 쓴다.
const VERSION = "v1";
const STATIC_CACHE = `bm-static-${VERSION}`;
// Workers Assets는 /offline.html을 /offline으로 307 리다이렉트한다. 이동 요청에 리다이렉트된 응답을 돌려주면 브라우저가 거부하므로 최종 주소를 쓴다.
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("bm-") && k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isImmutableAsset(pathname) {
  return pathname.startsWith("/_next/static/") || pathname.startsWith("/icons/");
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  // 서버 액션(POST)과 업로드는 절대 건드리지 않는다.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // 분석 API, 원본 사진, RSC 데이터 요청은 항상 네트워크로 그대로 보낸다.
  if (url.pathname.startsWith("/api/")) return;
  if (request.headers.get("rsc") || url.searchParams.has("_rsc")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  if (isImmutableAsset(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
