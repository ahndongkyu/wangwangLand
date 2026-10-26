"use client"

import { useRef, useState } from "react"
import { disconnectDevicePush } from "../lib/device"

export function LogoutForm({ action, children, className }: { action: () => Promise<void>; children: React.ReactNode; className?: string }) {
  const busy = useRef(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  return <form className={className} action={async () => {
    if (busy.current) return
    busy.current = true; setPending(true); setError("")
    try { await disconnectDevicePush() }
    catch { setError("기기 알림을 해제하지 못했습니다. 연결을 확인하고 다시 로그아웃해 주세요."); busy.current = false; setPending(false); return }
    try { await action() } finally { busy.current = false; setPending(false) }
  }}><fieldset disabled={pending} className="min-w-0">{children}</fieldset>{pending && <p role="status" className="text-center text-xs text-muted-foreground">로그아웃 중…</p>}{error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}</form>
}
