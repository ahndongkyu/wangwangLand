"use client"

import { useRouter } from "next/navigation"
import { useRef, useState, useTransition } from "react"

import { deleteEvent, type RecurrenceScope } from "../api/mutations"
import { RecurringScopeDialog } from "./recurring-scope-dialog"
import { EventConflictNotice } from "./event-conflict-notice"
import { useToast } from "@/shared/components/toast"

interface Props {
  returnHref?: string
  id: string
  updatedAt: string
  /** 반복 일정이면 같은 그룹 일정 목록 (id, starts_at). 단건이면 빈 배열/미전달. */
  groupDates?: { id: string; starts_at: string; updated_at: string }[]
  /** 현재 일정 시작 ISO (반복 범위 계산용) */
  currentStartsAt?: string
}

export function DeleteEventButton({ id, updatedAt, groupDates = [], currentStartsAt = "", returnHref = "/admin/calendar" }: Props) {
  const toast = useToast()
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [scopeOpen, setScopeOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [conflict, setConflict] = useState(false)
  const running = useRef(false)
  const revision = useRef({ id, updated_at: updatedAt, groupDates })

  const isRecurring = groupDates.length > 1

  function runDelete(scope: RecurrenceScope) {
    if (running.current || conflict) return
    running.current = true
    startTransition(async () => {
      try {
      const initial = revision.current
      const expected = scope === "one" || !initial.groupDates.length ? [initial] : initial.groupDates
      const res = await deleteEvent(id, scope, expected.map(({ id, updated_at }) => ({ id, updated_at: id === initial.id ? initial.updated_at : updated_at })))
      if (res?.error) {
        if (res.conflict) setConflict(true)
        toast.error(res.error)
        setConfirming(false)
        setScopeOpen(false)
        return
      }
      if (res.warning) toast.warning(res.warning)
      else toast.success(
        res.count && res.count > 1
          ? `${res.count}건 일정을 삭제했어요.`
          : "일정을 삭제했어요."
      )
      router.push(returnHref)
      router.refresh()
      } catch {
        toast.error("삭제 결과를 확인하지 못했습니다. 최신 일정을 확인해 주세요.")
      } finally { running.current = false }
    })
  }

  if (conflict) return <EventConflictNotice />

  // 반복 일정 — 범위 선택 다이얼로그
  if (isRecurring) {
    return (
      <>
        <button
          type="button"
          disabled={pending}
          onClick={() => setScopeOpen(true)}
          className="min-h-11 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
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
        disabled={pending}
        onClick={() => setConfirming(true)}
        className="min-h-11 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
      >
        일정 삭제
      </button>
    )
  }
  return (
    <div className="flex max-w-full flex-wrap items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-1.5 text-xs">
      <span className="text-destructive">정말 삭제할까요? 신청자 전원에게 알림이 갑니다.</span>
      <button
        type="button"
        onClick={() => runDelete("one")}
        disabled={pending}
        className="min-h-11 px-2 font-semibold text-destructive hover:underline disabled:opacity-50"
      >
        {pending ? "삭제 중..." : "삭제"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={pending}
        className="min-h-11 px-2 text-muted-foreground hover:underline"
      >
        취소
      </button>
    </div>
  )
}
