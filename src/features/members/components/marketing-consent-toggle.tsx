"use client"

import { useState, useTransition } from "react"
import { Bell, BellOff } from "lucide-react"

import { updateMarketingConsent } from "../api/actions"
import { useToast } from "@/shared/components/toast"
import { cn } from "@/shared/lib/utils"

interface Props {
  agreedAt: string | null
}

export function MarketingConsentToggle({ agreedAt }: Props) {
  const [agreed, setAgreed] = useState(!!agreedAt)
  const [pending, startTransition] = useTransition()
  const toast = useToast()

  function handleToggle() {
    const next = !agreed
    setAgreed(next) // 즉시 반영 (optimistic)
    startTransition(async () => {
      const result = await updateMarketingConsent(next)
      if (result.error) {
        toast.error(result.error)
        setAgreed(!next) // 롤백
        return
      }
      toast.success(
        next
          ? "공지·소식 수신에 동의했습니다. 기기 알림 연결도 확인해 주세요."
          : "공지·소식 수신 동의를 해제했습니다. 신청 관련 알림 설정은 유지됩니다."
      )
    })
  }

  return (
    <div className="w-full rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-1.5 text-base font-semibold text-foreground">
            {agreed ? <Bell className="size-4 text-primary" /> : <BellOff className="size-4 text-muted-foreground" />}
            공지·소식 수신 동의
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            새 공지·일상 등 소식을 받는 선택 동의입니다. 실제 수신을 위해 아래에서 기기 알림도 연결해 주세요.
            <br />
            <span className="text-[11px] text-muted-foreground/70">
              동의를 해제해도 신청 승인·일정 변경 알림은 별도로 유지됩니다.
            </span>
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-label="공지·소식 수신 동의"
          aria-checked={agreed}
          onClick={handleToggle}
          disabled={pending}
          className={cn(
            "relative shrink-0 inline-flex min-h-11 w-12 items-center rounded-lg focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
          )}
        >
          <span className={cn("flex h-7 w-12 items-center rounded-full transition-colors", agreed ? "bg-primary" : "bg-secondary")}><span
            className={cn(
              "inline-block size-5 rounded-full bg-white shadow transition-transform",
              agreed ? "translate-x-6" : "translate-x-1"
            )}
          /></span>
        </button>
      </div>
    </div>
  )
}
