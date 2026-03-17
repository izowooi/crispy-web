// TimeNuts Service Worker - Phase 3에서 Web Push 알림 구현 예정

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim())
})

// Push 이벤트 처리 (추후 구현)
self.addEventListener('push', event => {
  if (!event.data) return

  const data = event.data.json()
  const title = data.title ?? 'TimeNuts'
  const options = {
    body: data.body ?? '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag ?? 'timenuts',
    data: { url: data.url ?? '/' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      const client = windowClients.find(c => c.url === url && 'focus' in c)
      if (client) return client.focus()
      return clients.openWindow(url)
    })
  )
})
