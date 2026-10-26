import { getPushSubscriptionStatus, subscribePush, unsubscribePush } from "../api/actions"

export type DevicePushState = "checking" | "install" | "unsupported" | "blocked" | "off" | "on" | "error"

export function devicePushSupport(): DevicePushState | null {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone
  if (ios && !standalone) return "install"
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported"
  return null
}

export async function pushRegistration(): Promise<ServiceWorkerRegistration> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("알림 연결이 지연되고 있습니다. 다시 시도해 주세요.")), 8000) }),
    ])
  } finally { clearTimeout(timer) }
}

export async function readDevicePushState(): Promise<DevicePushState> {
  const support = devicePushSupport()
  if (support) return support
  if (Notification.permission === "denied") return "blocked"
  if (Notification.permission !== "granted") return "off"
  const sub = await (await pushRegistration()).pushManager.getSubscription()
  if (!sub) return "off"
  const result = await getPushSubscriptionStatus(sub.endpoint)
  if (result.error) throw new Error(result.error)
  return result.subscribed ? "on" : "off"
}

export async function connectDevicePush(publicKey: string): Promise<boolean> {
  // 사용자 클릭 이후 첫 비동기 호출로 권한을 요청한다.
  const permission = await Notification.requestPermission()
  if (permission !== "granted") return false
  const reg = await pushRegistration()
  let sub = await reg.pushManager.getSubscription()
  if (sub) {
    const status = await getPushSubscriptionStatus(sub.endpoint)
    if (status.error) throw new Error(status.error)
    if (status.subscribed) return true
    if (!await sub.unsubscribe()) throw new Error("이전 기기 연결을 해제하지 못했습니다.")
    sub = null
  }
  const base64 = publicKey.replace(/-/g, "+").replace(/_/g, "/")
  const key = Uint8Array.from(atob(base64 + "=".repeat((4 - base64.length % 4) % 4)), c => c.charCodeAt(0))
  sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
  const json = sub.toJSON()
  const result = await subscribePush({ endpoint: sub.endpoint, p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "", userAgent: navigator.userAgent })
  if (result.error) throw new Error(result.error)
  return true
}

export async function disconnectDevicePush(): Promise<void> {
  if (!("serviceWorker" in navigator)) return
  const reg = await navigator.serviceWorker.getRegistration("/")
  if (!reg || !("pushManager" in reg)) return
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  const result = await unsubscribePush(sub.endpoint)
  if (result.error) throw new Error(result.error)
  if (!await sub.unsubscribe()) throw new Error("기기의 알림 해제를 완료하지 못했습니다. 다시 시도해 주세요.")
}
