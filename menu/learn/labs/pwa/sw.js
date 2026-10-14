// 실습용 서비스 워커: /api/time 요청을 URL의 ?s= 값에 따라 세 가지 전략으로 처리한다.
const CACHE = "lab-pwa-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

async function put(request, response) {
  const cache = await caches.open(CACHE);
  await cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname !== "/api/time") return;
  const strategy = url.searchParams.get("s");

  if (strategy === "cache-first") {
    // 있으면 캐시를 그대로 쓴다. 빠르지만 한 번 저장되면 계속 옛날 값이다.
    event.respondWith(caches.match(event.request).then((hit) => hit || fetch(event.request).then((r) => put(event.request, r))));
  } else if (strategy === "network-first") {
    // 항상 서버에서 받는다. 인터넷이 끊겼을 때만 캐시를 쓴다. (이 앱의 페이지 전략과 같은 방향)
    event.respondWith(fetch(event.request).then((r) => put(event.request, r)).catch(() => caches.match(event.request)));
  } else if (strategy === "stale-while-revalidate") {
    // 캐시를 먼저 보여주고, 뒤에서 새 값을 받아 다음번을 위해 저장한다.
    event.respondWith(
      caches.match(event.request).then((hit) => {
        const network = fetch(event.request).then((r) => put(event.request, r));
        return hit || network;
      }),
    );
  }
});
