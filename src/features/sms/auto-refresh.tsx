"use client"

import { useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"

export function SmsAutoRefresh() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  useEffect(() => {
    const refresh = () => {
      if (!document.hidden && !pending) startTransition(() => router.refresh())
    }
    const timer = window.setInterval(refresh, 15000)
    document.addEventListener("visibilitychange", refresh)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", refresh)
    }
  }, [router, pending])
  return <div className="flex flex-col items-end gap-1">
    <button type="button" disabled={pending} aria-busy={pending}
      onClick={() => startTransition(() => router.refresh())}
      className="inline-flex min-h-11 items-center rounded-lg border border-border bg-card px-4 text-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60">
      {pending ? "결과 조회 중…" : "결과 새로고침"}
    </button>
    <span className="text-xs text-muted-foreground">화면 표시 중 15초마다 자동 갱신</span>
  </div>
}
