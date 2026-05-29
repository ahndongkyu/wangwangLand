"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Camera, Check, Copy, Share2 } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import {
  dateKey,
  todayKst,
  formatTimeKst,
  KST_OFFSET_MS,
} from "@/features/events/lib/date"
import {
  CATEGORY_COLOR,
  eventDisplayLabel,
  customColorStyle,
  getEventTitle,
} from "@/features/events/types"
import type { EventWithSignupCount } from "@/features/events/types"

interface Props {
  events: EventWithSignupCount[]
}

function isoToDateKey(iso: string): string {
  // dateKey() 내부에서 KST 변환을 직접 처리하므로, toKst()를 한 번 더 거치면 +18h 되어 날짜 오류 발생.
  return dateKey(new Date(iso))
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
    return `• ${time} [${label}] ${getEventTitle(ev)}${signup}`
  })
  return [header, ...lines].join("\n")
}

// 카테고리별 실제 색상값 (CSS 변수 없이 고정)
const CATEGORY_HEX: Record<string, { bg: string; text: string }> = {
  volunteer: { bg: "#E87C3E", text: "#FFFFFF" },
  event:     { bg: "#059669", text: "#FFFFFF" },
  closed:    { bg: "#9CA3AF", text: "#FFFFFF" },
  custom:    { bg: "#7C7AC9", text: "#FFFFFF" },
}

function buildScheduleImage(
  dateStr: string,
  evs: EventWithSignupCount[]
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const SCALE = 2
    const W = 680
    const HEADER_H = 72
    const ROW_H = 64
    const FOOTER_H = 36
    const PAD = 24
    const totalH = HEADER_H + evs.length * ROW_H + FOOTER_H

    const canvas = document.createElement("canvas")
    canvas.width = W * SCALE
    canvas.height = totalH * SCALE
    const ctx = canvas.getContext("2d")!
    ctx.scale(SCALE, SCALE)

    // 배경
    ctx.fillStyle = "#FAF6F0"
    ctx.fillRect(0, 0, W, totalH)

    // 헤더 영역
    ctx.fillStyle = "#F0E8DC"
    ctx.fillRect(0, 0, W, HEADER_H)

    // 브랜드명
    ctx.fillStyle = "#E87C3E"
    ctx.font = "bold 13px sans-serif"
    ctx.fillText("🐾 왕왕랜드", PAD, 22)

    // 날짜
    ctx.fillStyle = "#2C2C2A"
    ctx.font = "bold 20px sans-serif"
    ctx.fillText(fullDayLabel(dateStr), PAD, 52)

    // 건수
    ctx.fillStyle = "#9B8F80"
    ctx.font = "13px sans-serif"
    ctx.fillText(`${evs.length}건`, PAD + ctx.measureText(fullDayLabel(dateStr)).width + 8, 52)

    // 구분선
    ctx.strokeStyle = "#E5DDD0"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, HEADER_H)
    ctx.lineTo(W, HEADER_H)
    ctx.stroke()

    // 각 이벤트 행
    evs.forEach((ev, i) => {
      const y = HEADER_H + i * ROW_H

      // 행 구분선 (첫 행 제외)
      if (i > 0) {
        ctx.strokeStyle = "#EDE5DC"
        ctx.lineWidth = 0.5
        ctx.beginPath()
        ctx.moveTo(PAD, y)
        ctx.lineTo(W - PAD, y)
        ctx.stroke()
      }

      const isCustom = ev.category === "custom"
      const hex = isCustom && ev.custom_color ? ev.custom_color : CATEGORY_HEX[ev.category]?.bg ?? "#9CA3AF"
      const label = eventDisplayLabel(ev)

      // 카테고리 배지
      const badgeX = PAD
      const badgeY = y + ROW_H / 2 - 9
      const badgeW = ctx.measureText(label).width + 16
      ctx.fillStyle = hex + "26" // ~15% opacity
      roundRect(ctx, badgeX, badgeY, badgeW, 18, 9)
      ctx.fillStyle = hex
      ctx.font = "bold 11px sans-serif"
      ctx.fillText(label, badgeX + 8, badgeY + 13)

      // 제목
      const titleX = badgeX + badgeW + 10
      ctx.fillStyle = "#2C2C2A"
      ctx.font = "500 14px sans-serif"
      const maxTitleW = W - titleX - PAD - 80
      ctx.fillText(truncateText(ctx, getEventTitle(ev), maxTitleW), titleX, y + ROW_H / 2 - 2)

      // 시간
      ctx.fillStyle = "#9B8F80"
      ctx.font = "12px sans-serif"
      ctx.fillText(formatRange(ev), titleX, y + ROW_H / 2 + 14)

      // 신청 수
      if (ev.signup_enabled && ev.signup_count > 0) {
        const signupText = `신청 ${ev.signup_count}`
        const signupW = ctx.measureText(signupText).width + 12
        const signupX = W - PAD - signupW
        ctx.fillStyle = "#E87C3E26"
        roundRect(ctx, signupX, y + ROW_H / 2 - 9, signupW, 18, 9)
        ctx.fillStyle = "#E87C3E"
        ctx.font = "bold 11px sans-serif"
        ctx.fillText(signupText, signupX + 6, y + ROW_H / 2 + 4)
      }
    })

    // 푸터
    ctx.fillStyle = "#C4B8AC"
    ctx.font = "11px sans-serif"
    ctx.fillText("wangwangland.kr", PAD, totalH - 12)

    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error("canvas toBlob 실패"))
    }, "image/png")
  })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
  ctx.fill()
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text
  let t = text
  while (t.length > 0 && ctx.measureText(t + "…").width > maxW) {
    t = t.slice(0, -1)
  }
  return t + "…"
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
      } catch { /* 취소 */ }
    }
    await handleCopy()
  }

  async function handleScreenshot() {
    if (capturing) return
    setCapturing(true)
    try {
      const blob = await buildScheduleImage(selected, selectedEvents)
      const fileName = `왕왕랜드_${fullDayLabel(selected)}.png`
      const file = new File([blob], fileName, { type: "image/png" })

      // 모바일: 이미지 파일 네이티브 공유
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: fileName })
        } catch { /* 취소 */ }
        return // 공유 시도 후엔 성공/취소 무관하게 다운로드 fallback 실행 안 함
      }

      // 데스크톱 fallback: 다운로드
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error("screenshot error", e)
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
                  ? "bg-primary text-primary-foreground dark:bg-[#d97045]"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {isToday ? `오늘 ${shortDayLabel(d)}` : shortDayLabel(d)}
            </button>
          )
        })}
      </div>

      {/* 일정 카드 */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
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
            >
              {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
              {copied ? "복사됨" : "복사"}
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Share2 className="size-3.5" />
              공유
            </button>
            <button
              type="button"
              onClick={handleScreenshot}
              disabled={capturing}
              className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
            >
              <Camera className="size-3.5" />
              {capturing ? "생성 중..." : "사진"}
            </button>
          </div>
        </div>

        {selectedEvents.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">일정이 없습니다.</p>
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
                      <p className="truncate text-sm font-medium text-foreground">{getEventTitle(ev)}</p>
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
