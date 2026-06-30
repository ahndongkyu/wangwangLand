"use client"

import { useMemo, useState } from "react"

import { cn } from "@/shared/lib/utils"
import { dateKey } from "../lib/date"
import type { RecurrenceScope } from "../api/mutations"

interface Props {
  open: boolean
  mode: "edit" | "delete"
  /** 현재 일정 시작 ISO */
  currentStartsAt: string
  /** 같은 반복 그룹 일정들 (id, starts_at) — starts_at 오름차순 */
  groupDates: { id: string; starts_at: string }[]
  pending?: boolean
  onConfirm: (scope: RecurrenceScope) => void
  onCancel: () => void
}

const SCOPES: { v: RecurrenceScope; main: string }[] = [
  { v: "one", main: "이 일정만" },
  { v: "after", main: "이 일정 + 이후 모두" },
  { v: "all", main: "전체 일정" },
]

function shortLabel(iso: string): string {
  const k = dateKey(new Date(iso)) // YYYY-MM-DD (KST)
  const [, m, d] = k.split("-")
  return `${Number(m)}/${Number(d)}`
}

export function RecurringScopeDialog({
  open,
  mode,
  currentStartsAt,
  groupDates,
  pending = false,
  onConfirm,
  onCancel,
}: Props) {
  const [scope, setScope] = useState<RecurrenceScope>("one")
  const isDelete = mode === "delete"

  const counts = useMemo(() => {
    const after = groupDates.filter(
      (g) => g.starts_at >= currentStartsAt
    ).length
    return { one: 1, after: after || 1, all: groupDates.length || 1 }
  }, [groupDates, currentStartsAt])

  const affected = useMemo(() => {
    const hit = new Set<string>()
    for (const g of groupDates) {
      if (scope === "all") hit.add(g.id)
      else if (scope === "after" && g.starts_at >= currentStartsAt) hit.add(g.id)
      else if (scope === "one" && g.starts_at === currentStartsAt) hit.add(g.id)
    }
    return hit
  }, [scope, groupDates, currentStartsAt])

  if (!open) return null

  const cnt =
    scope === "one" ? counts.one : scope === "after" ? counts.after : counts.all

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div className="w-full max-w-[420px] overflow-hidden rounded-2xl bg-card shadow-2xl">
        <div className="px-5 pb-1 pt-5">
          <h2 className="text-base font-bold text-foreground">
            {isDelete ? "삭제 범위" : "수정 적용 범위"}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isDelete
              ? "어디까지 삭제할까요? (되돌릴 수 없어요)"
              : "변경한 내용을 어디까지 적용할까요?"}
          </p>
        </div>

        <div className="space-y-2 px-5 py-3">
          {SCOPES.map((o) => {
            const c =
              o.v === "one"
                ? counts.one
                : o.v === "after"
                  ? counts.after
                  : counts.all
            const selected = scope === o.v
            return (
              <label
                key={o.v}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border-[1.5px] px-3.5 py-3 transition-colors",
                  selected && !isDelete && "border-primary bg-primary/5",
                  selected && isDelete && "border-destructive bg-destructive/5",
                  !selected && "border-border hover:border-border/70"
                )}
              >
                <input
                  type="radio"
                  name="scope"
                  checked={selected}
                  onChange={() => setScope(o.v)}
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    isDelete ? "accent-destructive" : "accent-primary"
                  )}
                />
                <span className="flex-1">
                  <span className="block text-sm font-bold text-foreground">
                    {o.main}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {scopeDesc(o.v, groupDates, currentStartsAt)}
                  </span>
                </span>
                <span className="self-center rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-muted-foreground">
                  {c}건
                </span>
              </label>
            )
          })}
        </div>

        {/* 적용 대상 미리보기 */}
        {groupDates.length > 0 && (
          <div className="mx-5 border-t border-dashed border-border pt-3">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">
              적용 대상 미리보기
            </p>
            <div className="flex flex-wrap gap-1.5">
              {groupDates.map((g) => {
                const isCur = g.starts_at === currentStartsAt
                const isHit = affected.has(g.id)
                return (
                  <span
                    key={g.id}
                    className={cn(
                      "rounded-md px-2 py-1 text-[11px] font-semibold tabular-nums",
                      !isHit && "bg-secondary text-muted-foreground/70",
                      isHit && isDelete && "bg-destructive/15 text-destructive line-through",
                      isHit && !isDelete && "bg-[#F2E2E6] text-[#8E4F60]",
                      isCur && "outline outline-2 outline-offset-1 outline-primary"
                    )}
                  >
                    {shortLabel(g.starts_at)}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="text-sm font-medium text-muted-foreground disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => onConfirm(scope)}
            disabled={pending}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-60",
              isDelete ? "bg-destructive" : "bg-primary"
            )}
          >
            {pending
              ? "처리 중..."
              : isDelete
                ? `${cnt}건 삭제`
                : `${cnt}건 수정 저장`}
          </button>
        </div>
      </div>
    </div>
  )
}

function scopeDesc(
  v: RecurrenceScope,
  group: { starts_at: string }[],
  current: string
): string {
  if (group.length === 0) return ""
  const first = shortLabel(group[0].starts_at)
  const last = shortLabel(group[group.length - 1].starts_at)
  const cur = shortLabel(current)
  if (v === "one") return `${cur} 하나만`
  if (v === "after") return `${cur} 부터 ${last} 까지`
  return `${first} 부터 ${last} 까지 모두`
}
