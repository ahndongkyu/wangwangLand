"use client"

import { useEffect } from "react"

/** Service Worker 자동 등록 — 앱 진입 시 한 번만 실행 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((e) => console.error("[SW register]", e))
  }, [])

  return null
}
