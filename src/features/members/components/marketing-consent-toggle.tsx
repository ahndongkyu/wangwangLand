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
          ? "알림 수신에 동의했습니다. 권한 팝업이 뜨면 허용해주세요."
          : "알림 수신을 해제했습니다."
      )
    })
  }

  return (
    <div className="w-full rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-1.5 text-base font-semibold text-foreground">
            {agreed ? <Bell className="size-4 text-primary" /> : <BellOff className="size-4 text-muted-foreground" />}
            마케팅·알림 수신
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            새 공지·일상이 올라오면 푸시 알림으로 알려드려요. 언제든 해제할 수 있습니다.
            <br />
            <span className="text-[11px] text-muted-foreground/70">
              iOS는 홈 화면에 추가한 후 알림이 작동합니다.
            </span>
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={agreed}
          onClick={handleToggle}
          disabled={pending}
          className={cn(
            "relative shrink-0 inline-flex h-7 w-12 items-center rounded-full transition-colors disabled:opacity-50",
            agreed ? "bg-primary" : "bg-secondary"
          )}
        >
          <span
            className={cn(
              "inline-block size-5 rounded-full bg-white shadow transition-transform",
              agreed ? "translate-x-6" : "translate-x-1"
            )}
          />
        </button>
      </div>
    </div>
  )
}
