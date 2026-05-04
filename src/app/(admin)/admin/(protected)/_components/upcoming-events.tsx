"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Camera, Check, Copy, Share2 } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import {
  toKst,
  dateKey,
  todayKst,
  formatTimeKst,
  KST_OFFSET_MS,
} from "@/features/events/lib/date"
import {
  CATEGORY_COLOR,
  eventDisplayLabel,
  customColorStyle,
} from "@/features/events/types"
import type { EventWithSignupCount } from "@/features/events/types"

interface Props {
  events: EventWithSignupCount[]
}

function isoToDateKey(iso: string): string {
  return dateKey(toKst(iso))
}

function shortDayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d) + KST_OFFSET_MS)
  const dow = ["일", "월", "화", "수", "목", "금", "토"][date.getUTCDay()]
  return `${m}/${d} (${dow})`
}

function fullDayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d) + KST_OFFSET_MS)
  const dow = ["일", "월", "화", "수", "목", "금", "토"][date.getUTCDay()]
  return `${m}월 ${d}일(${dow})`
}

function formatRange(ev: EventWithSignupCount): string {
  if (ev.all_day) return "종일"
  return `${formatTimeKst(ev.starts_at)} – ${formatTimeKst(ev.ends_at)}`
}

function buildShareText(dateStr: string, evs: EventWithSignupCount[]): string {
  const header = `📅 ${fullDayLabel(dateStr)} 왕왕랜드 일정`
  const lines = evs.map((ev) => {
    const label = eventDisplayLabel(ev)
    const time = formatRange(ev)
    const signup = ev.signup_enabled && ev.signup_count > 0 ? ` (신청 ${ev.signup_count}명)` : ""
    return `• ${time} [${label}] ${ev.title}${signup}`
  })
  return [header, ...lines].join("\n")
}

export function UpcomingEvents({ events }: Props) {
  const todayStr = dateKey(todayKst())

  const grouped = events.reduce<Record<string, EventWithSignupCount[]>>((acc, ev) => {
    const key = isoToDateKey(ev.starts_at)
    ;(acc[key] ??= []).push(ev)
    return acc
  }, {})
  const dates = Object.keys(grouped).sort()

  const [selected, setSelected] = useState<string>(dates[0] ?? todayStr)
  const [copied, setCopied] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const tabsRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = tabsRef.current
    if (!container) return
    const active = container.querySelector<HTMLElement>("[data-active='true']")
    if (active) {
      active.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" })
    }
  }, [selected])

  const selectedEvents = grouped[selected] ?? []

  async function handleCopy() {
    const text = buildShareText(selected, selectedEvents)
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleShare() {
    const text = buildShareText(selected, selectedEvents)
    const title = `${fullDayLabel(selected)} 왕왕랜드 일정`
    if (navigator.share) {
      try {
        await navigator.share({ title, text })
        return
      } catch {
        // 취소
      }
    }
    await handleCopy()
  }

  async function handleScreenshot() {
    if (!cardRef.current || capturing) return
    setCapturing(true)
    try {
      const html2canvas = (await import("html2canvas")).default
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2, // 고해상도
        useCORS: true,
        logging: false,
      })

      canvas.toBlob(async (blob) => {
        if (!blob) return
        const file = new File([blob], `왕왕랜드_${fullDayLabel(selected)}.png`, {
          type: "image/png",
        })

        // 모바일: 이미지 파일 공유
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({
              title: `${fullDayLabel(selected)} 왕왕랜드 일정`,
              files: [file],
            })
            return
          } catch {
            // 취소 시 다운로드로 fallback
          }
        }

        // 데스크톱: 이미지 다운로드
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `왕왕랜드_${fullDayLabel(selected)}.png`
        a.click()
        URL.revokeObjectURL(url)
      }, "image/png")
    } finally {
      setCapturing(false)
    }
  }

  if (dates.length === 0) return null

  return (
    <div>
      {/* 날짜 탭 */}
      <div
        ref={tabsRef}
        className="mb-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none"
        style={{ scrollbarWidth: "none" }}
      >
        {dates.map((d) => {
          const isToday = d === todayStr
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
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {isToday ? `오늘 ${shortDayLabel(d)}` : shortDayLabel(d)}
            </button>
          )
        })}
      </div>

      {/* 일정 카드 — 스크린샷 캡처 대상 */}
      <div ref={cardRef} className="overflow-hidden rounded-lg border border-border bg-card">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-4 py-2.5">
          <span className="text-sm font-semibold text-foreground">
            {fullDayLabel(selected)}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {selectedEvents.length}건
            </span>
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              title="텍스트 복사"
            >
              {copied ? (
                <Check className="size-3.5 text-emerald-600" />
              ) : (
                <Copy className="size-3.5" />
              )}
              {copied ? "복사됨" : "복사"}
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              title="텍스트 공유"
            >
              <Share2 className="size-3.5" />
              공유
            </button>
            <button
              type="button"
              onClick={handleScreenshot}
              disabled={capturing}
              className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
              title="이미지로 저장·공유"
            >
              <Camera className="size-3.5" />
              {capturing ? "캡처 중..." : "사진"}
            </button>
          </div>
        </div>

        {/* 일정 목록 */}
        {selectedEvents.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            일정이 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {selectedEvents.map((ev) => {
              const isCustom = ev.category === "custom"
              const color = CATEGORY_COLOR[ev.category]
              const customStyle = isCustom ? customColorStyle(ev.custom_color) : null
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
                        {ev.title}
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
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
