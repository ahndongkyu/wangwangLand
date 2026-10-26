/* 왕왕랜드 Service Worker - 푸시 알림 처리 */

const OFFLINE_CACHE = "wangwang-offline-v1"
const OFFLINE_URL = "/offline.html"

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(OFFLINE_CACHE).then(async (cache) => {
    await cache.add(new Request(OFFLINE_URL, { cache: "reload", credentials: "omit" }))
    await self.skipWaiting()
  }))
})

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    self.clients.claim(),
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("wangwang-offline-") && key !== OFFLINE_CACHE).map((key) => caches.delete(key)))),
  ]))
})

// 개인 화면·API·문서는 캐시하지 않고, 전체 페이지의 네트워크 실패만 안내합니다.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== "GET" || event.request.mode !== "navigate" || url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/")) return
  event.respondWith(fetch(event.request).catch(async () => {
    const cache = await caches.open(OFFLINE_CACHE)
    return await cache.match(OFFLINE_URL) || new Response("인터넷 연결을 확인한 뒤 다시 시도해 주세요.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } })
  }))
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
  let target = new URL("/", self.location.origin)
  try {
    const candidate = new URL(event.notification.data?.url || "/", self.location.origin)
    if (candidate.origin === self.location.origin && !candidate.username && !candidate.password) target = candidate
  } catch { /* 잘못된 주소는 홈으로 연결합니다. */ }
  const url = target.href

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // 이미 열린 탭이 있으면 포커스
      for (const client of clientList) {
        if (client.url === url && "focus" in client) {
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
