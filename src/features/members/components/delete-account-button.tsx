"use client"

import { useState, useTransition } from "react"

import { deleteAccount } from "../api/actions"
import { useToast } from "@/shared/components/toast"

/**
 * 마이페이지 하단의 작은 회원 탈퇴 버튼.
 * 1) 텍스트 링크 클릭
 * 2) 인라인 확인 영역 노출 → "정말 탈퇴" 클릭 시 실행
 */
export function DeleteAccountButton() {
  const toast = useToast()
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteAccount()
      if (res?.error) {
        toast.error(res.error)
        setConfirming(false)
      }
      // 성공 시 server action 이 redirect("/") 처리.
    })
  }

  if (!confirming) {
    return (
      <div className="pt-6 text-center">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="text-[11px] text-muted-foreground/70 underline-offset-4 hover:text-destructive hover:underline"
        >
          회원 탈퇴
        </button>
      </div>
    )
  }

  return (
    <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center">
      <p className="text-xs text-foreground">
        정말 탈퇴하시겠어요? 계정 정보와 활동 기록이 모두 삭제되며 복구할 수 없습니다.
      </p>
      <div className="mt-3 flex justify-center gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-50"
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          className="rounded-md bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "탈퇴 중..." : "정말 탈퇴"}
        </button>
      </div>
    </div>
  )
}
