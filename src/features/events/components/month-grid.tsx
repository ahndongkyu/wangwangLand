import Link from "next/link"

import {
  CATEGORY_COLOR,
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
  /** 셀 클릭 시 보낼 href base. 기본 admin. */
  hrefBase?: string
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"]

/**
 * 월간 7×6 그리드. Kakaowork 스타일을 톤다운.
 * - 종일 이벤트 = 색 배경 막대
 * - 시간 이벤트 = 좌측 점 + 회색 텍스트
 */
export function MonthGrid({ yearMonth, events, hrefBase = "/admin/calendar" }: Props) {
  const days = monthGridDays(yearMonth)

  // 날짜별 이벤트 그룹
  const byDate = new Map<string, CalendarEvent[]>()
  for (const ev of events) {
    // 종일·여러날 이벤트는 시작일 셀에만 표시 (간단화). 추후 개선 여지.
    const key = dateKey(new Date(ev.starts_at))
    const arr = byDate.get(key) ?? []
    arr.push(ev)
    byDate.set(key, arr)
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {/* 요일 헤더 */}
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

      {/* 6주 × 7일 = 42 셀 */}
      <div className="grid grid-cols-7 grid-rows-6">
        {days.map((d, i) => {
          const inMonth = isSameMonth(d, yearMonth)
          const today = isToday(d)
          const dayEvents = byDate.get(dateKey(d)) ?? []
          const dayNum = new Date(d.getTime() + 9 * 60 * 60 * 1000).getUTCDate()
          const dow = i % 7

          return (
            <div
              key={d.toISOString()}
              className={cn(
                "min-h-[110px] border-r border-t border-border p-1.5",
                (i + 1) % 7 === 0 && "border-r-0",
                i < 7 && "border-t-0",
                !inMonth && "bg-muted/30"
              )}
            >
              <div
                className={cn(
                  "mb-1 inline-flex size-5 items-center justify-center rounded-full text-[11px] font-medium",
                  today && "bg-primary text-primary-foreground",
                  !today && inMonth && dow === 0 && "text-destructive/80",
                  !today && inMonth && dow === 6 && "text-sky-600/80",
                  !today && inMonth && dow !== 0 && dow !== 6 && "text-foreground",
                  !inMonth && "text-muted-foreground/40"
                )}
              >
                {dayNum}
              </div>

              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((ev) => (
                  <EventChip key={ev.id} event={ev} hrefBase={hrefBase} />
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
  hrefBase,
}: {
  event: CalendarEvent
  hrefBase: string
}) {
  const color = CATEGORY_COLOR[event.category]

  if (event.all_day) {
    return (
      <Link
        href={`${hrefBase}/${event.id}`}
        className={cn(
          "block truncate rounded-sm px-1.5 py-0.5 text-[11px] font-medium",
          color.bg,
          color.text
        )}
        title={event.title}
      >
        {event.title}
      </Link>
    )
  }

  return (
    <Link
      href={`${hrefBase}/${event.id}`}
      className="flex min-w-0 items-center gap-1 rounded-sm px-1 py-0.5 text-[11px] hover:bg-secondary"
      title={`${formatTimeKst(event.starts_at)} ${event.title}`}
    >
      <span
        aria-hidden
        className={cn("size-1.5 shrink-0 rounded-full", color.dot)}
      />
      <span className="truncate text-muted-foreground">
        <span className="text-foreground/80">{formatTimeKst(event.starts_at)}</span>{" "}
        {event.title}
      </span>
    </Link>
  )
}
