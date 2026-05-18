"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"

import {
  cancelOwnAdoptionApplication,
  cancelOwnVolunteerApplication,
} from "@/features/applications/api/mutations"
import { useToast } from "@/shared/components/toast"

interface Props {
  id: string
  kind: "adoption" | "volunteer"
  triggerClassName?: string
}

export function CancelMyApplicationButton({ id, kind, triggerClassName }: Props) {
  const toast = useToast()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<"reason" | "confirm">("reason")
  const [reason, setReason] = useState("")
  const [pending, startTransition] = useTransition()

  // 모달 열릴 때 스크롤 잠금
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden"
    else document.body.style.overflow = ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  function handleOpen() {
    setStep("reason")
    setReason("")
    setOpen(true)
  }

  function handleClose() {
    setOpen(false)
    setReason("")
    setStep("reason")
  }

  function handleCancel() {
    startTransition(async () => {
      const result =
        kind === "volunteer"
          ? await cancelOwnVolunteerApplication(id, reason)
          : await cancelOwnAdoptionApplication(id, reason)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("신청이 취소되었습니다")
        handleClose()
        router.refresh()
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={triggerClassName ?? "text-[11px] text-muted-foreground/70 underline-offset-4 hover:text-destructive hover:underline"}
      >
        신청 취소
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
        >
          {/* 배경 */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* 모달 카드 */}
          <div className="relative w-full max-w-sm rounded-xl border border-border bg-card shadow-xl">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">
                {step === "reason" ? "신청 취소" : "취소 확인"}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {step === "reason"
                  ? "취소 사유를 입력해주세요. 운영진에게 전달됩니다."
                  : "아래 내용으로 신청을 취소합니다."}
              </p>
            </div>

            <div className="px-5 py-4 space-y-3">
              {step === "reason" ? (
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="예: 개인 사정으로 일정이 변경되었습니다"
                  rows={4}
                  className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                />
              ) : (
                <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-sm text-foreground">
                  {reason}
                </div>
              )}

              {step === "confirm" && (
                <p className="text-xs text-muted-foreground">
                  취소 후 신청 내역에 취소 기록이 남습니다.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border">
              {step === "reason" ? (
                <>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                  >
                    돌아가기
                  </button>
                  <button
                    type="button"
                    disabled={!reason.trim()}
                    onClick={() => setStep("confirm")}
                    className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-40"
                  >
                    다음
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setStep("reason")}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={pending}
                    className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                  >
                    {pending ? "처리 중..." : "취소 확정"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
