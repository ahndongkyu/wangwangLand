"use client"

import { useEffect, useRef, useState } from "react"

export function NetworkStatus() {
  const [status, setStatus] = useState<"online" | "offline" | "checking" | "restored">("online")
  const controller = useRef<AbortController | null>(null)
  async function check() {
    controller.current?.abort()
    const request = new AbortController()
    controller.current = request
    setStatus("checking")
    const timeout = setTimeout(() => request.abort(), 5000)
    try {
      const response = await fetch("/offline.html", { cache: "no-store", credentials: "omit", signal: request.signal })
      if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) throw new Error("offline")
      if (controller.current === request) setStatus("restored")
    } catch { if (controller.current === request) setStatus("offline") }
    finally { clearTimeout(timeout) }
  }
  useEffect(() => {
    let active = true
    const requests = controller
    const offline = () => { requests.current?.abort(); requests.current = null; setStatus("offline") }
    const online = () => { void check() }
    queueMicrotask(() => { if (active && !navigator.onLine) offline() })
    window.addEventListener("offline", offline)
    window.addEventListener("online", online)
    return () => { active = false; requests.current?.abort(); requests.current = null; window.removeEventListener("offline", offline); window.removeEventListener("online", online) }
  }, [])
  if (status === "online") return null
  return <aside aria-label="인터넷 연결 안내" className="border-b border-border bg-secondary px-4 py-3 text-foreground">
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
      <div role="status" className="min-w-0 text-sm leading-relaxed">
        <p className="font-semibold">{status === "restored" ? "연결을 다시 확인했습니다." : status === "checking" ? "연결을 확인하고 있습니다…" : "인터넷 또는 사이트 연결을 확인해 주세요."}</p>
        <p className="text-muted-foreground">{status === "restored" ? "전송 중이던 신청·승인·저장은 내역을 먼저 확인한 뒤 다시 시도해 주세요." : "연결이 불안정할 때는 신청·승인·저장을 잠시 멈춰 주세요. 입력 중인 화면을 새로고침하지 마세요."}</p>
      </div>
      {status === "restored" ? <button type="button" onClick={() => setStatus("online")} className="min-h-11 rounded-lg border border-border px-4 text-sm hover:bg-card">확인</button> : <button type="button" onClick={() => void check()} disabled={status === "checking"} className="min-h-11 rounded-lg border border-border px-4 text-sm hover:bg-card disabled:opacity-50">연결 다시 확인</button>}
    </div>
  </aside>
}
