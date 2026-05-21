"use client"

import { useState, useTransition } from "react"
import { setMaintenanceMessage, setMaintenanceMode } from "@/features/settings/api/mutations"
import { DEFAULT_MAINTENANCE_MESSAGE } from "@/features/settings/api/queries"

const MAX_LEN = 500

interface Props {
  initialEnabled: boolean
  initialMessage: string
}

export function MaintenanceSettings({ initialEnabled, initialMessage }: Props) {
  const [isOn, setIsOn] = useState(initialEnabled)
  const [message, setMessage] = useState(initialMessage)
  const [savedMessage, setSavedMessage] = useState(initialMessage)
  const [toggling, startToggle] = useTransition()
  const [saving, startSave] = useTransition()
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  const dirty = message.trim() !== savedMessage.trim()

  function handleToggle() {
    const next = !isOn
    setToast(null)
    startToggle(async () => {
      const res = await setMaintenanceMode(next)
      if (res?.error) {
        setToast({ type: "err", text: res.error })
      } else {
        setIsOn(next)
        setToast({
          type: "ok",
          text: next
            ? "점검 모드가 켜졌습니다. 일반 사용자 접근이 차단됩니다."
            : "점검 모드가 꺼졌습니다. 홈페이지가 정상 운영 중입니다.",
        })
      }
    })
  }

  function handleSaveMessage() {
    setToast(null)
    startSave(async () => {
      const res = await setMaintenanceMessage(message)
      if (res?.error) {
        setToast({ type: "err", text: res.error })
      } else {
        setSavedMessage(message.trim())
        setToast({ type: "ok", text: "안내 문구가 저장되었습니다." })
      }
    })
  }

  function handleResetDefault() {
    setMessage(DEFAULT_MAINTENANCE_MESSAGE)
  }

  return (
    <div className="space-y-6">
      {/* 점검 모드 토글 */}
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
            disabled={toggling}
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
        <div
          className={`mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
            isOn
              ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
          }`}
        >
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              isOn ? "bg-red-500 animate-pulse" : "bg-emerald-500"
            }`}
          />
          {isOn ? "점검 중 — 사용자 접근 차단됨" : "정상 운영 중"}
        </div>

        {isOn && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
            ⚠️ 점검 모드가 켜져 있습니다. 작업 완료 후 반드시 끄세요.
          </div>
        )}
      </div>

      {/* 점검 안내 문구 */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">점검 안내 문구</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              사용자가 점검 페이지에서 보게 될 안내 문구를 입력하세요. 줄바꿈도 반영됩니다.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetDefault}
            className="shrink-0 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            기본값
          </button>
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN))}
          rows={5}
          placeholder="예) 일시적인 시스템 점검 중입니다. 잠시 후 다시 방문해 주세요."
          className="mt-3 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />

        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            {message.length}/{MAX_LEN}
          </span>
          <div className="flex items-center gap-2">
            {dirty && (
              <span className="text-[11px] text-amber-600 dark:text-amber-400">
                저장 안 된 변경사항이 있습니다
              </span>
            )}
            <button
              type="button"
              onClick={handleSaveMessage}
              disabled={saving || !dirty}
              className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      </div>

      {/* 미리보기 */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">미리보기</h2>
          <span className="text-[11px] text-muted-foreground">사용자 화면 기준</span>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-background">
          <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
            <div className="mb-4 text-5xl">🐾</div>
            <h3 className="text-xl font-bold text-foreground">잠시 점검 중입니다...</h3>
            <p className="mt-3 max-w-sm whitespace-pre-line text-sm text-muted-foreground leading-relaxed">
              {message.trim() || DEFAULT_MAINTENANCE_MESSAGE}
            </p>
            <div className="mt-5 flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-xs text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              서버 점검 중
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-2 text-sm shadow-lg ${
            toast.type === "ok"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  )
}
