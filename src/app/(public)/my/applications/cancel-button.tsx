"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import {
  cancelOwnAdoptionApplication,
  cancelOwnVolunteerApplication,
} from "@/features/applications/api/mutations"
import { useToast } from "@/shared/components/toast"

interface Props {
  id: string
  kind: "adoption" | "volunteer"
}

export function CancelMyApplicationButton({ id, kind }: Props) {
  const toast = useToast()
  const router = useRouter()
  const [step, setStep] = useState<"idle" | "reason" | "confirm">("idle")
  const [reason, setReason] = useState("")
  const [pending, startTransition] = useTransition()

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
        setStep("idle")
        setReason("")
        router.refresh()
      }
    })
  }

  if (step === "idle") {
    return (
      <button
        type="button"
        onClick={() => setStep("reason")}
        className="text-[11px] text-muted-foreground/70 underline-offset-4 hover:text-destructive hover:underline"
      >
        신청 취소
      </button>
    )
  }

  if (step === "reason") {
    return (
      <div className="mt-2 space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
        <p className="text-xs font-semibold text-destructive">취소 사유를 입력해주세요</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="예: 일정이 변경되었습니다"
          rows={3}
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => { setStep("idle"); setReason("") }}
            className="text-xs text-muted-foreground hover:underline"
          >
            돌아가기
          </button>
          <button
            type="button"
            disabled={!reason.trim()}
            onClick={() => setStep("confirm")}
            className="rounded-md bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-40"
          >
            다음
          </button>
        </div>
      </div>
    )
  }

  // step === "confirm"
  return (
    <div className="mt-2 space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
      <p className="text-xs font-semibold text-destructive">정말 취소하시겠어요?</p>
      <p className="rounded bg-background/60 px-2 py-1.5 text-xs text-foreground">{reason}</p>
      <p className="text-[11px] text-muted-foreground">
        취소 후 신청 내역에 취소 기록이 남습니다.
      </p>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setStep("reason")}
          className="text-xs text-muted-foreground hover:underline"
        >
          수정
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={pending}
          className="rounded-md bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
        >
          {pending ? "처리 중..." : "취소 확정"}
        </button>
      </div>
    </div>
  )
}
