"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { deleteEvent, type RecurrenceScope } from "../api/mutations"
import { RecurringScopeDialog } from "./recurring-scope-dialog"
import { useToast } from "@/shared/components/toast"

interface Props {
  id: string
  /** 반복 일정이면 같은 그룹 일정 목록 (id, starts_at). 단건이면 빈 배열/미전달. */
  groupDates?: { id: string; starts_at: string }[]
  /** 현재 일정 시작 ISO (반복 범위 계산용) */
  currentStartsAt?: string
}

export function DeleteEventButton({ id, groupDates = [], currentStartsAt = "" }: Props) {
  const toast = useToast()
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [scopeOpen, setScopeOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const isRecurring = groupDates.length > 1

  function runDelete(scope: RecurrenceScope) {
    startTransition(async () => {
      const res = await deleteEvent(id, scope)
      if (res?.error) {
        toast.error(res.error)
        setConfirming(false)
        setScopeOpen(false)
        return
      }
      toast.success(
        res.count && res.count > 1
          ? `${res.count}건 일정을 삭제했어요.`
          : "일정을 삭제했어요."
      )
      router.push("/admin/calendar")
      router.refresh()
    })
  }

  // 반복 일정 — 범위 선택 다이얼로그
  if (isRecurring) {
    return (
      <>
        <button
          type="button"
          onClick={() => setScopeOpen(true)}
          className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
        >
          일정 삭제
        </button>
        <RecurringScopeDialog
          open={scopeOpen}
          mode="delete"
          currentStartsAt={currentStartsAt}
          groupDates={groupDates}
          pending={pending}
          onConfirm={runDelete}
          onCancel={() => setScopeOpen(false)}
        />
      </>
    )
  }

  // 단건 — 기존 인라인 확인
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
        onClick={() => runDelete("one")}
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
