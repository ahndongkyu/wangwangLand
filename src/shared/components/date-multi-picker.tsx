"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/shared/lib/utils"

interface Props {
  /** form data 의 name. 다중 hidden input 으로 직렬화. */
  name: string
  /** 초기 선택 날짜 (YYYY-MM-DD). */
  defaultValue?: string[]
  /** 이전 날짜 선택 가능 여부. 기본 false (오늘 이후만). */
  allowPast?: boolean
  /** 표시할 월 수 (현재 월부터). 기본 2 (이번 달 + 다음 달). */
  monthsAhead?: number
  /** 최대 선택 개수. 기본 무제한. */
  max?: number
}

const KST_OFFSET = 9 * 60 * 60 * 1000
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"]

function todayKey(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + KST_OFFSET)
  return formatKey(kst)
}

function formatKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
}

function ymToYearMonth(y: number, m: number): string {
  return `${y}-${String(m).padStart(2, "0")}`
}

function shiftYm(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number)
  const total = y * 12 + (m - 1) + delta
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  return ymToYearMonth(ny, nm)
}

/** 7×6 칸 (해당 월) — KST 기준 일요일 시작. */
function gridForMonth(ym: string): Date[] {
  const [y, m] = ym.split("-").map(Number)
  // KST 1일 자정의 UTC ISO
  const firstUtc = new Date(`${ym}-01T00:00:00+09:00`)
  const firstKst = new Date(firstUtc.getTime() + KST_OFFSET)
  const dow = firstKst.getUTCDay()
  const start = new Date(firstUtc.getTime() - dow * 86400000)
  const days: Date[] = []
  for (let i = 0; i < 42; i++) {
    days.push(new Date(start.getTime() + i * 86400000 + KST_OFFSET))
  }
  return days
}

/**
 * 모바일 친화적인 날짜 다중 선택 픽커.
 * - 한 화면에 한 달 그리드, < > 버튼으로 이동
 * - 클릭 토글로 선택
 * - 선택된 날짜는 hidden input 으로 폼 데이터에 직렬화
 */
export function DateMultiPicker({
  name,
  defaultValue = [],
  allowPast = false,
  monthsAhead = 2,
  max,
}: Props) {
  const today = todayKey()
  const initialYm = today.slice(0, 7)
  const maxYm = useMemo(
    () => shiftYm(initialYm, Math.max(0, monthsAhead - 1)),
    [initialYm, monthsAhead]
  )

  const [ym, setYm] = useState<string>(initialYm)
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(defaultValue)
  )

  const days = useMemo(() => gridForMonth(ym), [ym])
  const sortedSelected = useMemo(
    () => Array.from(selected).sort(),
    [selected]
  )

  const canPrev = ym > initialYm
  const canNext = ym < maxYm
  const [y, m] = ym.split("-").map(Number)

  function toggle(key: string, isPast: boolean, isOtherMonth: boolean) {
    if (isOtherMonth) return
    if (!allowPast && isPast) return
    const next = new Set(selected)
    if (next.has(key)) {
      next.delete(key)
    } else {
      if (max && next.size >= max) return
      next.add(key)
    }
    setSelected(next)
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <button
          type="button"
          onClick={() => canPrev && setYm(shiftYm(ym, -1))}
          disabled={!canPrev}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-30"
          aria-label="이전 달"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-semibold text-foreground">
          {y}년 {m}월
        </span>
        <button
          type="button"
          onClick={() => canNext && setYm(shiftYm(ym, 1))}
          disabled={!canNext}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-30"
          aria-label="다음 달"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* 요일 라인 */}
      <div className="grid grid-cols-7 px-2 pt-2 text-center text-[11px] font-medium text-muted-foreground">
        {WEEKDAYS.map((w, i) => (
          <span
            key={w}
            className={cn(
              i === 0 && "text-destructive/70",
              i === 6 && "text-sky-600/70"
            )}
          >
            {w}
          </span>
        ))}
      </div>

      {/* 그리드 */}
      <div className="grid grid-cols-7 gap-1 p-2">
        {days.map((d, i) => {
          const key = formatKey(d)
          const isOtherMonth = key.slice(0, 7) !== ym
          const isPast = key < today
          const isSelected = selected.has(key)
          const dow = i % 7
          const isToday = key === today
          const disabled = isOtherMonth || (!allowPast && isPast)

          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key, isPast, isOtherMonth)}
              disabled={disabled}
              className={cn(
                "relative flex aspect-square items-center justify-center rounded-md text-xs font-medium transition-colors",
                isOtherMonth && "text-muted-foreground/30",
                !isOtherMonth && disabled && "text-muted-foreground/40 line-through",
                !disabled && !isSelected && "text-foreground hover:bg-secondary",
                !disabled && !isSelected && dow === 0 && "text-destructive/80",
                !disabled && !isSelected && dow === 6 && "text-sky-600/80",
                isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
                isToday && !isSelected && "ring-1 ring-primary/40"
              )}
            >
              {d.getUTCDate()}
            </button>
          )
        })}
      </div>

      {/* 선택 요약 + hidden inputs */}
      <div className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
        {sortedSelected.length === 0 ? (
          "가능한 날짜를 클릭해서 선택해 주세요."
        ) : (
          <span>
            <span className="font-semibold text-foreground">
              {sortedSelected.length}일
            </span>{" "}
            선택됨 · {sortedSelected.map((d) => d.slice(5)).join(", ")}
          </span>
        )}
      </div>

      {sortedSelected.map((d) => (
        <input key={d} type="hidden" name={name} value={d} />
      ))}
    </div>
  )
}
