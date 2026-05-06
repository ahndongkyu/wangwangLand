"use client"

import { useState, useTransition } from "react"
import { setMaintenanceMode } from "@/features/settings/api/mutations"

export function MaintenanceToggle({ initialValue }: { initialValue: boolean }) {
  const [isOn, setIsOn] = useState(initialValue)
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  function handleToggle() {
    const next = !isOn
    setMessage(null)
    startTransition(async () => {
      const res = await setMaintenanceMode(next)
      if (res?.error) {
        setMessage(`오류: ${res.error}`)
      } else {
        setIsOn(next)
        setMessage(next ? "점검 모드가 켜졌습니다. 일반 사용자 접근이 차단됩니다." : "점검 모드가 꺼졌습니다. 홈페이지가 정상 운영 중입니다.")
      }
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">점검 모드</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            켜면 어드민을 제외한 모든 페이지 접근이 차단됩니다.
          </p>
        </div>

        {/* 토글 버튼 */}
        <button
          type="button"
          onClick={handleToggle}
          disabled={pending}
          aria-pressed={isOn}
          className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
            isOn ? "bg-red-500" : "bg-input"
          }`}
        >
          <span
            className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
              isOn ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* 상태 표시 */}
      <div className={`mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
        isOn
          ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
          : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
      }`}>
        <span className={`inline-block h-2 w-2 rounded-full ${isOn ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`} />
        {isOn ? "점검 중 — 사용자 접근 차단됨" : "정상 운영 중"}
      </div>

      {message && (
        <p className="mt-3 text-xs text-muted-foreground">{message}</p>
      )}

      {isOn && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
          ⚠️ 점검 모드가 켜져 있습니다. 작업 완료 후 반드시 끄세요.
        </div>
      )}
    </div>
  )
}
