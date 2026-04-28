"use client"

import { useState, useTransition } from "react"

import { deleteEvent } from "../api/mutations"
import { useToast } from "@/shared/components/toast"

export function DeleteEventButton({ id }: { id: string }) {
  const toast = useToast()
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
      >
        일정 삭제
      </button>
    )
  }
  return (
    <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-1.5 text-xs">
      <span className="text-destructive">정말 삭제할까요? 신청자 전원에게 알림이 갑니다.</span>
      <button
        type="button"
        onClick={() => {
          startTransition(async () => {
            const res = await deleteEvent(id)
            if (res?.error) {
              toast.error(res.error)
              setConfirming(false)
            }
          })
        }}
        disabled={pending}
        className="font-semibold text-destructive hover:underline disabled:opacity-50"
      >
        {pending ? "삭제 중..." : "삭제"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-muted-foreground hover:underline"
      >
        취소
      </button>
    </div>
  )
}
