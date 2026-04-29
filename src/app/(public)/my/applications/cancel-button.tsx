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

/**
 * 본인 신청 삭제 버튼.
 * - 캘린더에 자동 등록된 일정도 cascade 로 함께 삭제됨.
 * - 운영진의 처리 기록이 모두 사라지므로 재신청해야 함을 안내.
 */
export function CancelMyApplicationButton({ id, kind }: Props) {
  const toast = useToast()
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleCancel() {
    startTransition(async () => {
      const result =
        kind === "volunteer"
          ? await cancelOwnVolunteerApplication(id)
          : await cancelOwnAdoptionApplication(id)
      if (result?.error) {
        toast.error(result.error)
        setConfirming(false)
      } else {
        toast.success("신청이 삭제되었습니다")
        router.refresh()
      }
    })
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-[11px] text-muted-foreground/70 underline-offset-4 hover:text-destructive hover:underline"
      >
        신청 삭제
      </button>
    )
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1 text-[11px]">
      <span className="text-destructive">
        삭제하면 캘린더 일정도 함께 사라집니다.
      </span>
      <button
        type="button"
        onClick={handleCancel}
        disabled={pending}
        className="font-semibold text-destructive hover:underline disabled:opacity-50"
      >
        {pending ? "처리 중..." : "삭제"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-muted-foreground hover:underline"
      >
        취소
      </button>
    </span>
  )
}
