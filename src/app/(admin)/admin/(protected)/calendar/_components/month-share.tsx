"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, Check, Copy, Share2 } from "lucide-react"
import Link from "next/link"

import {
  buildDayShareImage,
  buildDayShareText,
  buildMonthShareImage,
  buildMonthShareText,
  fullDayLabel,
  formatRange,
  isoToDateKey,
  shortDayLabel,
} from "@/features/events/lib/share"
import {
  CATEGORY_COLOR,
  customColorStyle,
  eventDisplayLabel,
  getEventTitle,
  type EventWithSignupCount,
} from "@/features/events/types"
import { cn } from "@/shared/lib/utils"

interface Props {
  yearMonth: string
  events: EventWithSignupCount[]
}

export function MonthShare({ yearMonth, events }: Props) {
  const [y, m] = yearMonth.split("-").map(Number)

  // 날짜별 그룹
  const grouped = events.reduce<Record<string, EventWithSignupCount[]>>(
    (acc, ev) => {
      const key = isoToDateKey(ev.starts_at)
      ;(acc[key] ??= []).push(ev)
      return acc
    },
    {}
  )
  const dates = Object.keys(grouped).sort()

  const [selected, setSelected] = useState<string>(dates[0] ?? "")
  const [copiedDay, setCopiedDay] = useState(false)
  const [capturingDay, setCapturingDay] = useState(false)
  const [copiedMonth, setCopiedMonth] = useState(false)
  const [capturingMonth, setCapturingMonth] = useState(false)
  const tabsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 선택된 날짜가 새 월에서 사라졌으면 첫 날짜로 보정
    if (selected && !grouped[selected]) {
      setSelected(dates[0] ?? "")
    }
  }, [yearMonth, dates, grouped, selected])

  useEffect(() => {
    const container = tabsRef.current
    if (!container) return
    const active = container.querySelector<HTMLElement>("[data-active='true']")
    if (active) {
      active.scrollIntoView({
        inline: "center",
        block: "nearest",
        behavior: "smooth",
      })
    }
  }, [selected])

  const selectedEvents = selected ? grouped[selected] ?? [] : []

  // ── 하루치 공유 ──────────────────────────────────────
  async function handleCopyDay() {
    if (!selected) return
    await navigator.clipboard.writeText(
      buildDayShareText(selected, selectedEvents)
    )
    setCopiedDay(true)
    setTimeout(() => setCopiedDay(false), 2000)
  }
  async function handleShareDay() {
    if (!selected) return
    const text = buildDayShareText(selected, selectedEvents)
    const title = `${fullDayLabel(selected)} 왕왕랜드 일정`
    if (navigator.share) {
      try {
        await navigator.share({ title, text })
        return
      } catch {
        /* 취소 */
      }
    }
    await handleCopyDay()
  }
  async function handleScreenshotDay() {
    if (!selected || capturingDay) return
    setCapturingDay(true)
    try {
      const blob = await buildDayShareImage(selected, selectedEvents)
      const fileName = `왕왕랜드_${fullDayLabel(selected)}.png`
      const file = new File([blob], fileName, { type: "image/png" })
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: fileName })
          return
        } catch {
          /* 취소 → 다운로드 */
        }
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error("day screenshot error", e)
    } finally {
      setCapturingDay(false)
    }
  }

  // ── 월 전체 공유 ──────────────────────────────────────
  async function handleCopyMonth() {
    await navigator.clipboard.writeText(buildMonthShareText(yearMonth, events))
    setCopiedMonth(true)
    setTimeout(() => setCopiedMonth(false), 2000)
  }
  async function handleShareMonth() {
    const text = buildMonthShareText(yearMonth, events)
    const title = `${y}년 ${m}월 왕왕랜드 일정`
    if (navigator.share) {
      try {
        await navigator.share({ title, text })
        return
      } catch {
        /* 취소 */
      }
    }
    await handleCopyMonth()
  }
  async function handleScreenshotMonth() {
    if (capturingMonth) return
    setCapturingMonth(true)
    try {
      const blob = await buildMonthShareImage(yearMonth, events)
      const fileName = `왕왕랜드_${y}년${m}월_일정.png`
      const file = new File([blob], fileName, { type: "image/png" })
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: fileName })
          return
        } catch {
          /* 취소 → 다운로드 */
        }
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error("month screenshot error", e)
    } finally {
      setCapturingMonth(false)
    }
  }

  return (
    <section className="mt-6 space-y-4">
      {/* 월 전체 공유 헤더 */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-secondary/40 px-4 py-2.5">
          <h2 className="text-sm font-semibold text-foreground">
            {y}년 {m}월 일정 공유
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              총 {events.length}건
            </span>
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCopyMonth}
              className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {copiedMonth ? (
                <Check className="size-3.5 text-emerald-600" />
              ) : (
                <Copy className="size-3.5" />
              )}
              {copiedMonth ? "복사됨" : "월 전체 복사"}
            </button>
            <button
              type="button"
              onClick={handleShareMonth}
              className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Share2 className="size-3.5" />
              월 전체 공유
            </button>
            <button
              type="button"
              onClick={handleScreenshotMonth}
              disabled={capturingMonth}
              className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
            >
              <Camera className="size-3.5" />
              {capturingMonth ? "생성 중..." : "월 전체 사진"}
            </button>
          </div>
        </div>

        {/* 날짜 탭 */}
        {dates.length > 0 ? (
          <>
            <div
              ref={tabsRef}
              className="flex gap-2 overflow-x-auto px-4 pt-3 pb-2 scrollbar-none"
              style={{ scrollbarWidth: "none" }}
            >
              {dates.map((d) => {
                const isActive = d === selected
                return (
                  <button
                    key={d}
                    type="button"
                    data-active={isActive}
                    onClick={() => setSelected(d)}
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap",
                      isActive
                        ? "bg-primary text-primary-foreground dark:bg-[#d97045]"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {shortDayLabel(d)}
                  </button>
                )
              })}
            </div>

            {/* 선택일 헤더 + 하루 공유 버튼 */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-y border-border bg-secondary/20 px-4 py-2.5">
              <span className="text-sm font-semibold text-foreground">
                {fullDayLabel(selected)}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {selectedEvents.length}건
                </span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleCopyDay}
                  className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {copiedDay ? (
                    <Check className="size-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  {copiedDay ? "복사됨" : "복사"}
                </button>
                <button
                  type="button"
                  onClick={handleShareDay}
                  className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <Share2 className="size-3.5" />
                  공유
                </button>
                <button
                  type="button"
                  onClick={handleScreenshotDay}
                  disabled={capturingDay}
                  className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
                >
                  <Camera className="size-3.5" />
                  {capturingDay ? "생성 중..." : "사진"}
                </button>
              </div>
            </div>

            {/* 선택일 일정 리스트 */}
            <ul className="divide-y divide-border">
              {selectedEvents.length === 0 ? (
                <li className="py-8 text-center text-sm text-muted-foreground">
                  일정이 없습니다.
                </li>
              ) : (
                selectedEvents.map((ev) => {
                  const isCustom = ev.category === "custom"
                  const color = CATEGORY_COLOR[ev.category]
                  const customStyle = isCustom
                    ? customColorStyle(ev.custom_color)
                    : null
                  return (
                    <li key={ev.id}>
                      <Link
                        href={`/admin/calendar/${ev.id}`}
                        className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-secondary/40"
                      >
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
                            {getEventTitle(ev)}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatRange(ev)}
                            {ev.location && ` · ${ev.location}`}
                          </p>
                        </div>
                        {ev.signup_enabled && ev.signup_count > 0 && (
                          <span className="mt-0.5 shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                            신청 {ev.signup_count}
                          </span>
                        )}
                      </Link>
                    </li>
                  )
                })
              )}
            </ul>
          </>
        ) : (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            이 달에는 등록된 일정이 없습니다.
          </p>
        )}
      </div>
    </section>
  )
}
