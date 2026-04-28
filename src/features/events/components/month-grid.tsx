"use client"

import { useRouter } from "next/navigation"

import {
  CATEGORY_COLOR,
  customColorStyle,
  type CalendarEvent,
} from "../types"
import {
  dateKey,
  formatTimeKst,
  isSameMonth,
  isToday,
  monthGridDays,
} from "../lib/date"
import { cn } from "@/shared/lib/utils"

interface Props {
  yearMonth: string
  events: CalendarEvent[]
  /** 이벤트 칩 클릭 시 보낼 href base. 기본 admin. */
  hrefBase?: string
  /**
   * 빈 셀 클릭 시 보낼 href base. 어드민에서만 사용.
   * 예: "/admin/calendar/new" 이면 "/admin/calendar/new?date=2026-04-30" 로 이동.
   */
  addHrefBase?: string
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"]

/**
 * 월간 7×6 그리드. Kakaowork 톤다운 버전.
 * - 종일 이벤트 = 색 배경 막대
 * - 시간 이벤트 = 좌측 점 + 회색 텍스트
 * - addHrefBase 가 주어지면 빈 셀 클릭 → 일정 추가 (날짜 자동 채움)
 */
export function MonthGrid({
  yearMonth,
  events,
  hrefBase = "/admin/calendar",
  addHrefBase,
}: Props) {
  const router = useRouter()
  const days = monthGridDays(yearMonth)

  const byDate = new Map<string, CalendarEvent[]>()
  for (const ev of events) {
    const key = dateKey(new Date(ev.starts_at))
    const arr = byDate.get(key) ?? []
    arr.push(ev)
    byDate.set(key, arr)
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="grid grid-cols-7 border-b border-border bg-secondary/40 text-center text-xs font-semibold text-muted-foreground">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={cn(
              "py-2",
              i === 0 && "text-destructive/80",
              i === 6 && "text-sky-600/80"
            )}
          >
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 grid-rows-6">
        {days.map((d, i) => {
          const inMonth = isSameMonth(d, yearMonth)
          const today = isToday(d)
          const cellKey = dateKey(d)
          const dayEvents = byDate.get(cellKey) ?? []
          const dayNum = new Date(d.getTime() + 9 * 60 * 60 * 1000).getUTCDate()
          const dow = i % 7

          const cellClickable = !!addHrefBase

          return (
            <div
              key={d.toISOString()}
              role={cellClickable ? "button" : undefined}
              tabIndex={cellClickable ? 0 : undefined}
              onClick={
                cellClickable
                  ? () => router.push(`${addHrefBase}?date=${cellKey}`)
                  : undefined
              }
              onKeyDown={
                cellClickable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        router.push(`${addHrefBase}?date=${cellKey}`)
                      }
                    }
                  : undefined
              }
              className={cn(
                "group min-h-[110px] border-r border-t border-border p-1.5 outline-none transition-colors",
                (i + 1) % 7 === 0 && "border-r-0",
                i < 7 && "border-t-0",
                !inMonth && "bg-muted/30",
                cellClickable &&
                  "cursor-pointer hover:bg-secondary/40 focus-visible:bg-secondary/60"
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "inline-flex size-5 items-center justify-center rounded-full text-[11px] font-medium",
                    today && "bg-primary text-primary-foreground",
                    !today && inMonth && dow === 0 && "text-destructive/80",
                    !today && inMonth && dow === 6 && "text-sky-600/80",
                    !today && inMonth && dow !== 0 && dow !== 6 && "text-foreground",
                    !inMonth && "text-muted-foreground/40"
                  )}
                >
                  {dayNum}
                </span>
                {cellClickable && (
                  <span
                    aria-hidden
                    className="text-[11px] text-muted-foreground/0 transition-opacity group-hover:text-muted-foreground"
                  >
                    + 추가
                  </span>
                )}
              </div>

              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 3).map((ev) => (
                  <EventChip
                    key={ev.id}
                    event={ev}
                    onClick={(e) => {
                      e.stopPropagation()
                      // 신청 자동 생성 이벤트는 신청 상세로 직행
                      if (
                        ev.source_application_id &&
                        ev.source_application_type
                      ) {
                        router.push(
                          `/admin/applications/${ev.source_application_type}/${ev.source_application_id}`
                        )
                      } else {
                        router.push(`${hrefBase}/${ev.id}`)
                      }
                    }}
                  />
                ))}
                {dayEvents.length > 3 && (
                  <p className="px-1 text-[10px] text-muted-foreground">
                    + {dayEvents.length - 3}개 더
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EventChip({
  event,
  onClick,
}: {
  event: CalendarEvent
  onClick: (e: React.MouseEvent) => void
}) {
  const isCustom = event.category === "custom"
  const color = CATEGORY_COLOR[event.category]
  const customStyle = isCustom ? customColorStyle(event.custom_color) : null

  if (event.all_day) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={event.title}
        style={customStyle?.background}
        className={cn(
          "block w-full truncate rounded-sm px-1.5 py-0.5 text-left text-[11px] font-medium",
          !isCustom && color.bg,
          !isCustom && color.text
        )}
      >
        {event.title}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={`${formatTimeKst(event.starts_at)} ${event.title}`}
      className="flex w-full min-w-0 items-center gap-1 rounded-sm px-1 py-0.5 text-left text-[11px] hover:bg-secondary"
    >
      <span
        aria-hidden
        style={customStyle?.dot}
        className={cn("size-1.5 shrink-0 rounded-full", !isCustom && color.dot)}
      />
      <span className="min-w-0 truncate text-muted-foreground">
        <span className="text-foreground/80">{formatTimeKst(event.starts_at)}</span>{" "}
        {event.title}
      </span>
    </button>
  )
}
