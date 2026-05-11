"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { X } from "lucide-react"

import {
  CATEGORY_COLOR,
  customColorStyle,
  eventDisplayLabel,
  publicEventTitle,
  type CalendarEvent,
} from "../types"
import {
  dateKey,
  formatTimeKst,
  formatKoreanDayLabel,
  isSameMonth,
  isToday,
  monthGridDays,
  KST_OFFSET_MS,
} from "../lib/date"
import { cn } from "@/shared/lib/utils"

interface Props {
  yearMonth: string
  events: CalendarEvent[]
  hrefBase?: string
  addHrefBase?: string
  maskNames?: boolean
  readOnly?: boolean
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"]

export function MonthGrid({
  yearMonth,
  events,
  hrefBase = "/admin/calendar",
  addHrefBase,
  maskNames = false,
  readOnly = false,
}: Props) {
  const router = useRouter()
  const days = monthGridDays(yearMonth)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const byDate = new Map<string, CalendarEvent[]>()
  for (const ev of events) {
    const key = dateKey(new Date(ev.starts_at))
    const arr = byDate.get(key) ?? []
    arr.push(ev)
    byDate.set(key, arr)
  }

  const selectedEvents = selectedKey ? (byDate.get(selectedKey) ?? []) : []

  // "5월 9일(금)" 형식
  function fullDayLabel(key: string) {
    const [y, m, d] = key.split("-").map(Number)
    const date = new Date(Date.UTC(y, m - 1, d) + KST_OFFSET_MS)
    const dow = ["일", "월", "화", "수", "목", "금", "토"][date.getUTCDay()]
    return `${m}월 ${d}일(${dow})`
  }

  function handleCellClick(cellKey: string, hasEvents: boolean) {
    // 모바일 도트 뷰: 날짜 탭으로 패널 토글
    if (selectedKey === cellKey) {
      setSelectedKey(null)
    } else {
      setSelectedKey(hasEvents ? cellKey : null)
      if (!hasEvents && addHrefBase) {
        router.push(`${addHrefBase}?date=${cellKey}`)
      }
    }
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

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 grid-rows-6">
        {days.map((d, i) => {
          const inMonth = isSameMonth(d, yearMonth)
          const today = isToday(d)
          const cellKey = dateKey(d)
          const dayEvents = byDate.get(cellKey) ?? []
          const dayNum = new Date(d.getTime() + 9 * 60 * 60 * 1000).getUTCDate()
          const dow = i % 7
          const isSelected = selectedKey === cellKey

          return (
            <div
              key={d.toISOString()}
              role="button"
              tabIndex={0}
              onClick={() => {
                // 통일된 동작: 셀 탭 → 그 날 이벤트 패널 토글
                // 단, 빈 셀이고 운영진 모드(addHrefBase 있음)면 일정 추가 페이지로
                if (dayEvents.length === 0 && addHrefBase) {
                  router.push(`${addHrefBase}?date=${cellKey}`)
                  return
                }
                handleCellClick(cellKey, dayEvents.length > 0)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  handleCellClick(cellKey, dayEvents.length > 0)
                }
              }}
              className={cn(
                "group border-r border-t border-border outline-none transition-colors",
                // 데스크톱: 기존 높이 유지
                "sm:min-h-[110px] sm:p-1.5",
                // 모바일: 컴팩트
                "min-h-[44px] p-1 cursor-pointer",
                (i + 1) % 7 === 0 && "border-r-0",
                i < 7 && "border-t-0",
                !inMonth && "bg-muted/30",
                isSelected && "bg-primary/5",
                addHrefBase && "sm:hover:bg-secondary/40 sm:focus-visible:bg-secondary/60"
              )}
            >
              {/* 날짜 숫자 */}
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
                {addHrefBase && (
                  <span
                    aria-hidden
                    className="hidden text-[11px] text-muted-foreground/0 transition-opacity sm:block sm:group-hover:text-muted-foreground"
                  >
                    + 추가
                  </span>
                )}
              </div>

              {/* 모바일: 컬러 도트 */}
              <div className="mt-0.5 flex flex-wrap gap-0.5 sm:hidden">
                {dayEvents.slice(0, 3).map((ev) => {
                  const isCustom = ev.category === "custom"
                  const color = CATEGORY_COLOR[ev.category]
                  const customStyle = isCustom ? customColorStyle(ev.custom_color) : null
                  return (
                    <span
                      key={ev.id}
                      aria-hidden
                      style={customStyle?.dot}
                      className={cn(
                        "size-1.5 rounded-full",
                        !isCustom && color.dot
                      )}
                    />
                  )
                })}
                {dayEvents.length > 3 && (
                  <span className="text-[9px] leading-none text-muted-foreground">
                    +{dayEvents.length - 3}
                  </span>
                )}
              </div>

              {/* 데스크톱: 텍스트 칩 — readOnly면 셀로 위임, 아니면 상세 페이지 */}
              <div className="mt-1 hidden space-y-0.5 sm:block">
                {dayEvents.slice(0, 3).map((ev) => (
                  <EventChip
                    key={ev.id}
                    event={ev}
                    maskNames={maskNames}
                    readOnly={readOnly}
                    onClick={(e) => {
                      if (readOnly) {
                        // 공개 캘린더 — 셀 클릭으로 위임 (전파 막지 않음)
                        return
                      }
                      e.stopPropagation()
                      router.push(`${hrefBase}/${ev.id}`)
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

      {/* 선택일 패널 — 모든 화면에서 표시 */}
      {selectedKey && selectedEvents.length > 0 && (
        <div className="border-t border-border">
          <div className="flex items-center justify-between bg-secondary/40 px-4 py-2.5">
            <span className="text-sm font-semibold text-foreground">
              {fullDayLabel(selectedKey)}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {selectedEvents.length}건
              </span>
            </span>
            <button
              type="button"
              onClick={() => setSelectedKey(null)}
              className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
              aria-label="닫기"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <ul className="divide-y divide-border">
            {selectedEvents.map((ev) => {
              const isCustom = ev.category === "custom"
              const color = CATEGORY_COLOR[ev.category]
              const customStyle = isCustom ? customColorStyle(ev.custom_color) : null
              const displayTitle = maskNames ? publicEventTitle(ev) : ev.title

              const content = (
                <div className="flex items-start gap-3 px-4 py-3">
                  <span
                    style={customStyle?.soft}
                    className={cn(
                      "mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                      !isCustom && color.soft,
                      !isCustom && color.softText
                    )}
                  >
                    {eventDisplayLabel(ev)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {displayTitle}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {ev.all_day ? "종일" : `${formatTimeKst(ev.starts_at)} – ${formatTimeKst(ev.ends_at)}`}
                      {ev.location && ` · ${ev.location}`}
                    </p>
                  </div>
                  {!readOnly && (
                    <span className="mt-0.5 shrink-0 text-xs text-muted-foreground">→</span>
                  )}
                </div>
              )

              return (
                <li key={ev.id}>
                  {readOnly ? (
                    <div>{content}</div>
                  ) : (
                    <Link
                      href={`${hrefBase}/${ev.id}`}
                      className="block transition-colors hover:bg-secondary/40 active:bg-secondary/60"
                    >
                      {content}
                    </Link>
                  )}
                </li>
              )
            })}
            {addHrefBase && (
              <li>
                <Link
                  href={`${addHrefBase}?date=${selectedKey}`}
                  className="flex items-center justify-center gap-1.5 px-4 py-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/5"
                >
                  + 이 날 일정 추가
                </Link>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

function EventChip({
  event,
  onClick,
  maskNames,
  readOnly,
}: {
  event: CalendarEvent
  onClick: (e: React.MouseEvent) => void
  maskNames: boolean
  readOnly: boolean
}) {
  const isCustom = event.category === "custom"
  const color = CATEGORY_COLOR[event.category]
  const customStyle = isCustom ? customColorStyle(event.custom_color) : null
  const displayTitle = maskNames ? publicEventTitle(event) : event.title

  if (readOnly) {
    if (event.all_day) {
      return (
        <span
          title={displayTitle}
          style={customStyle?.background}
          className={cn(
            "block w-full truncate rounded-sm px-1.5 py-0.5 text-left text-[11px] font-medium",
            !isCustom && color.bg,
            !isCustom && color.text
          )}
        >
          {displayTitle}
        </span>
      )
    }
    return (
      <span
        title={`${formatTimeKst(event.starts_at)} ${displayTitle}`}
        className="flex w-full min-w-0 items-center gap-1 rounded-sm px-1 py-0.5 text-left text-[11px]"
      >
        <span
          aria-hidden
          style={customStyle?.dot}
          className={cn("size-1.5 shrink-0 rounded-full", !isCustom && color.dot)}
        />
        <span className="min-w-0 truncate text-muted-foreground">
          <span className="text-foreground/80">{formatTimeKst(event.starts_at)}</span>{" "}
          {displayTitle}
        </span>
      </span>
    )
  }

  if (event.all_day) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={displayTitle}
        style={customStyle?.background}
        className={cn(
          "block w-full truncate rounded-sm px-1.5 py-0.5 text-left text-[11px] font-medium",
          !isCustom && color.bg,
          !isCustom && color.text
        )}
      >
        {displayTitle}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={`${formatTimeKst(event.starts_at)} ${displayTitle}`}
      className="flex w-full min-w-0 items-center gap-1 rounded-sm px-1 py-0.5 text-left text-[11px] hover:bg-secondary"
    >
      <span
        aria-hidden
        style={customStyle?.dot}
        className={cn("size-1.5 shrink-0 rounded-full", !isCustom && color.dot)}
      />
      <span className="min-w-0 truncate text-muted-foreground">
        <span className="text-foreground/80">{formatTimeKst(event.starts_at)}</span>{" "}
        {displayTitle}
      </span>
    </button>
  )
}
