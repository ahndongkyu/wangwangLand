"use client"

import { useEffect, useState } from "react"
import { Bell, BellOff } from "lucide-react"

import { subscribePush, unsubscribePush } from "../api/actions"
import { useToast } from "@/shared/components/toast"
import { cn } from "@/shared/lib/utils"

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i)
  }
  return output
}

interface Props {
  className?: string
}

export function PushSubscribeButton({ className }: Props) {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [pending, setPending] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setSupported(false)
      return
    }
    setSupported(true)

    // 현재 구독 상태 확인
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {})
  }, [])

  async function handleSubscribe() {
    if (!VAPID_PUBLIC_KEY) {
      toast.error("푸시 알림 설정이 누락되었습니다.")
      return
    }
    setPending(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        toast.error("알림 권한이 거부되었습니다.")
        return
      }

      const reg = await navigator.serviceWorker.ready
      const key = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer,
      })

      const json = sub.toJSON()
      const result = await subscribePush({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
        userAgent: navigator.userAgent,
      })
      if (result.error) {
        toast.error(`구독 실패: ${result.error}`)
        return
      }
      setSubscribed(true)
      toast.success("알림 구독 완료! 새 글이 올라오면 알려드릴게요.")
    } catch (e) {
      console.error("[push subscribe]", e)
      toast.error("구독에 실패했습니다.")
    } finally {
      setPending(false)
    }
  }

  async function handleUnsubscribe() {
    setPending(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await unsubscribePush(sub.endpoint)
        await sub.unsubscribe()
      }
      setSubscribed(false)
      toast.success("알림을 해제했습니다.")
    } catch (e) {
      console.error("[push unsubscribe]", e)
      toast.error("해제에 실패했습니다.")
    } finally {
      setPending(false)
    }
  }

  if (!supported) {
    return null
  }

  return (
    <button
      type="button"
      onClick={subscribed ? handleUnsubscribe : handleSubscribe}
      disabled={pending}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50",
        subscribed
          ? "bg-secondary text-foreground hover:bg-secondary/80"
          : "bg-primary text-primary-foreground hover:bg-primary/90",
        className
      )}
    >
      {subscribed ? <BellOff className="size-4" /> : <Bell className="size-4" />}
      {pending ? "처리 중..." : subscribed ? "알림 해제" : "알림 받기"}
    </button>
  )
}
