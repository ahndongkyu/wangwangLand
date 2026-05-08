"use client"

import { useEffect } from "react"
import { subscribePush } from "../api/actions"

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const STORAGE_KEY = "wwl_push_prompted_v1"

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i)
  return output
}

interface Props {
  /** 마케팅 동의 여부 — 동의자만 자동 권한 요청 */
  marketingAgreed: boolean
}

/**
 * 마케팅 수신 동의한 사용자에게 한 번 자동으로 푸시 권한 요청.
 * 거부 시 다시 묻지 않음 (localStorage에 시도 기록).
 * UI 없음 — 페이지 로드 후 백그라운드에서 동작.
 */
export function AutoPushPrompt({ marketingAgreed }: Props) {
  useEffect(() => {
    if (!marketingAgreed) return
    if (typeof window === "undefined") return
    if (!VAPID_PUBLIC_KEY) return
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return

    // 이미 시도했으면 패스
    if (localStorage.getItem(STORAGE_KEY)) return

    // 권한 상태 확인
    if (Notification.permission === "denied") {
      // 차단된 상태 → 시도 기록만 하고 끝 (사용자가 브라우저 설정에서 풀어야 함)
      localStorage.setItem(STORAGE_KEY, "denied")
      return
    }

    // iOS는 standalone 모드(홈 화면 추가)에서만 푸시 가능
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari 전용 속성
      window.navigator.standalone === true
    if (isIOS && !isStandalone) return

    // 약간의 딜레이 후 권한 팝업 (페이지 로드 직후 떠서 놀라지 않게)
    const timer = setTimeout(async () => {
      try {
        // 이미 권한 있고 endpoint도 있으면 패스
        const reg = await navigator.serviceWorker.ready
        const existing = await reg.pushManager.getSubscription()
        if (Notification.permission === "granted" && existing) {
          localStorage.setItem(STORAGE_KEY, "granted")
          return
        }

        // 권한 요청
        const permission = await Notification.requestPermission()
        localStorage.setItem(STORAGE_KEY, permission)
        if (permission !== "granted") return

        // endpoint 등록
        const key = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer,
        })
        const json = sub.toJSON()
        await subscribePush({
          endpoint: sub.endpoint,
          p256dh: json.keys?.p256dh ?? "",
          auth: json.keys?.auth ?? "",
          userAgent: navigator.userAgent,
        })
      } catch (e) {
        console.error("[AutoPushPrompt]", e)
      }
    }, 1500)

    return () => clearTimeout(timer)
  }, [marketingAgreed])

  return null
}
