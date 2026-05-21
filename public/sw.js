/* 왕왕랜드 Service Worker - 푸시 알림 처리 */

self.addEventListener("install", (event) => {
  // 새 SW 즉시 활성화
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

// 푸시 알림 수신
self.addEventListener("push", (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: "왕왕랜드", body: event.data.text() }
  }

  const title = payload.title || "왕왕랜드"
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/images/wangwang_logo.png",
    badge: payload.badge || "/images/wangwang_logo.png",
    image: payload.image,
    data: { url: payload.url || "/" },
    tag: payload.tag, // 같은 tag 알림은 덮어쓰기
    requireInteraction: false,
    vibrate: [100, 50, 100],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// 알림 클릭 → 해당 URL로 이동
self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data?.url || "/"

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // 이미 열린 탭이 있으면 포커스
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      // 없으면 새 창
      if (self.clients.openWindow) {
        return self.clients.openWindow(url)
      }
    })
  )
})
