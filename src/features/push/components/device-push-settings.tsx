"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { connectDevicePush, disconnectDevicePush, readDevicePushState, type DevicePushState } from "../lib/device"

const labels: Record<DevicePushState, string> = {
  checking: "확인 중", install: "홈 화면에 추가 필요", unsupported: "지원하지 않는 환경",
  blocked: "기기 권한 차단", off: "알림 꺼짐", on: "알림 연결됨", error: "연결 확인 실패",
}

export function DevicePushSettings() {
  const [state, setState] = useState<DevicePushState>("checking")
  const [message, setMessage] = useState("")
  const [pending, setPending] = useState(false)
  const busy = useRef(false)
  const revision = useRef(0)
  const refresh = useCallback(async () => {
    if (busy.current) return
    const version = ++revision.current
    try { const next = await readDevicePushState(); if (version === revision.current) setState(next) }
    catch { if (version === revision.current) setState("error") }
  }, [])
  useEffect(() => {
    let active = true
    const requests = revision
    const visible = () => { if (document.visibilityState === "visible") void refresh() }
    queueMicrotask(() => { if (active) void refresh() })
    window.addEventListener("focus", visible)
    document.addEventListener("visibilitychange", visible)
    return () => { active = false; requests.current++; window.removeEventListener("focus", visible); document.removeEventListener("visibilitychange", visible) }
  }, [refresh])

  async function change() {
    if (busy.current) return
    busy.current = true; revision.current++; setPending(true); setMessage("")
    try {
      if (state === "on") { await disconnectDevicePush(); setState("off"); setMessage("이 기기의 알림을 해제했습니다.") }
      else {
        const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!key) throw new Error("알림 설정을 준비 중입니다. 잠시 후 다시 시도해 주세요.")
        if (await connectDevicePush(key)) { setState("on"); setMessage("이 기기에 알림을 연결했습니다.") }
        else { setState(Notification.permission === "denied" ? "blocked" : "off"); setMessage("알림을 허용하지 않았습니다. 원할 때 다시 설정할 수 있습니다.") }
      }
    } catch (error) { setState("error"); setMessage(error instanceof Error ? error.message : "처리하지 못했습니다. 다시 시도해 주세요.") }
    finally { busy.current = false; setPending(false) }
  }

  return <section id="device-notifications" aria-label="기기 알림 설정" className="scroll-mt-24 rounded-2xl border border-border bg-card p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">이 기기의 알림</h2><span className="rounded-md bg-secondary px-2 py-1 text-sm text-foreground" role="status">{labels[state]}</span></div>
    <p className="mt-2 text-sm text-muted-foreground">신청 승인·일정 변경 등의 알림을 받습니다. 공지·소식 수신 동의와 별도로 설정합니다.</p>
    {state === "install" && <p className="mt-3 text-sm">Safari에서 공유 → 홈 화면에 추가한 뒤, 설치된 왕왕랜드를 열어 알림을 설정해 주세요.</p>}
    {state === "blocked" && <p className="mt-3 text-sm">브라우저 또는 기기 설정에서 왕왕랜드의 알림을 허용한 뒤 상태를 다시 확인해 주세요.</p>}
    {state === "unsupported" && <p className="mt-3 text-sm">지원하는 브라우저에서 열어 주세요. 신청 내역은 마이페이지에서 확인할 수 있습니다.</p>}
    <div className="mt-4 flex flex-wrap gap-2">
      {["on", "off"].includes(state) && <button type="button" disabled={pending} onClick={change} className="min-h-11 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-ring">{pending ? "처리 중…" : state === "on" ? "이 기기 알림 끄기" : "이 기기에서 알림 받기"}</button>}
      <button type="button" disabled={pending} onClick={() => { setMessage(""); void refresh() }} className="min-h-11 rounded-lg border border-border px-4 py-2 text-sm hover:bg-secondary disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-ring">상태 다시 확인</button>
    </div>
    {message && <p role="status" className="mt-3 text-sm">{message}</p>}
  </section>
}
