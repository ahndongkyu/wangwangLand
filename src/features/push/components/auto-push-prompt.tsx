"use client"

import { useEffect } from "react"
import { subscribePush } from "../api/actions"

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

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
 * 마케팅 수신 동의한 사용자에게 자동으로 푸시 권한 처리.
 * - 권한 default: 팝업 띄움 (브라우저가 자체적으로 너무 잦은 요청은 차단)
 * - 권한 granted: 등록된 endpoint 없으면 등록
 * - 권한 denied: 아무것도 안 함
 * 미동의자는 effect 자체가 실행 안 됨.
 */
export function AutoPushPrompt({ marketingAgreed }: Props) {
  useEffect(() => {
    if (!marketingAgreed) return
    if (typeof window === "undefined") return
    if (!VAPID_PUBLIC_KEY) return
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return
    if (Notification.permission === "denied") return

    // iOS는 standalone 모드(홈 화면 추가)에서만 푸시 가능
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari 전용 속성
      window.navigator.standalone === true
    if (isIOS && !isStandalone) return

    // 약간의 딜레이 (페이지 로드 직후 바로 떠서 놀라지 않게)
    const timer = setTimeout(async () => {
      try {
        const reg = await navigator.serviceWorker.ready
        const existing = await reg.pushManager.getSubscription()

        // 이미 권한 + endpoint 있으면 끝
        if (Notification.permission === "granted" && existing) return

        // 권한 요청 (이미 granted면 즉시 통과)
        const permission =
          Notification.permission === "granted"
            ? "granted"
            : await Notification.requestPermission()
        if (permission !== "granted") return

        // endpoint 등록 (이미 있으면 그대로 사용)
        let sub = existing
        if (!sub) {
          const key = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer,
          })
        }
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
