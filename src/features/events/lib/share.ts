// 일정 공유용 텍스트/이미지 생성 유틸 (UpcomingEvents 에서 추출)

import {
  CATEGORY_COLOR,
  customColorStyle,
  eventDisplayLabel,
  getEventTitle,
  type EventWithSignupCount,
} from "@/features/events/types"
import { KST_OFFSET_MS, dateKey, formatTimeKst } from "@/features/events/lib/date"

// ────────────────────────────────────────────────────────────
// 공용 헬퍼
// ────────────────────────────────────────────────────────────
export function isoToDateKey(iso: string): string {
  return dateKey(new Date(iso))
}

export function shortDayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d) + KST_OFFSET_MS)
  const dow = ["일", "월", "화", "수", "목", "금", "토"][date.getUTCDay()]
  return `${m}/${d} (${dow})`
}

export function fullDayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d) + KST_OFFSET_MS)
  const dow = ["일", "월", "화", "수", "목", "금", "토"][date.getUTCDay()]
  return `${m}월 ${d}일(${dow})`
}

export function formatRange(ev: EventWithSignupCount): string {
  if (ev.all_day) return "종일"
  if (ev.starts_at === ev.ends_at) return formatTimeKst(ev.starts_at)
  return `${formatTimeKst(ev.starts_at)} – ${formatTimeKst(ev.ends_at)}`
}

// 카테고리 → 실제 컬러값 (CSS 변수 없이 고정)
const CATEGORY_HEX: Record<string, { bg: string; text: string }> = {
  volunteer: { bg: "#E87C3E", text: "#FFFFFF" },
  regular_volunteer: { bg: "#BE7B8B", text: "#FFFFFF" },
  event: { bg: "#059669", text: "#FFFFFF" },
  closed: { bg: "#9CA3AF", text: "#FFFFFF" },
  custom: { bg: "#7C7AC9", text: "#FFFFFF" },
  adoption_consult: { bg: "#BAE6FD", text: "#0C4A6E" },
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
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

function truncateText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number
): string {
  if (ctx.measureText(text).width <= maxW) return text
  let t = text
  while (t.length > 0 && ctx.measureText(t + "…").width > maxW) {
    t = t.slice(0, -1)
  }
  return t + "…"
}

// ────────────────────────────────────────────────────────────
// 하루치 공유
// ────────────────────────────────────────────────────────────
export function buildDayShareText(
  dateStr: string,
  evs: EventWithSignupCount[]
): string {
  const header = `📅 ${fullDayLabel(dateStr)} 왕왕랜드 일정`
  const lines = evs.map((ev) => {
    const label = eventDisplayLabel(ev)
    const time = formatRange(ev)
    const signup =
      ev.signup_enabled && ev.signup_count > 0 ? ` (신청 ${ev.signup_count}명)` : ""
    return `• ${time} [${label}] ${getEventTitle(ev)}${signup}`
  })
  return [header, ...lines].join("\n")
}

export function buildDayShareImage(
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
    const totalH = HEADER_H + Math.max(evs.length, 1) * ROW_H + FOOTER_H

    const canvas = document.createElement("canvas")
    canvas.width = W * SCALE
    canvas.height = totalH * SCALE
    const ctx = canvas.getContext("2d")!
    ctx.scale(SCALE, SCALE)

    ctx.fillStyle = "#FAF6F0"
    ctx.fillRect(0, 0, W, totalH)

    ctx.fillStyle = "#F0E8DC"
    ctx.fillRect(0, 0, W, HEADER_H)

    ctx.fillStyle = "#E87C3E"
    ctx.font = "bold 13px sans-serif"
    ctx.fillText("🐾 왕왕랜드", PAD, 22)

    ctx.fillStyle = "#2C2C2A"
    ctx.font = "bold 20px sans-serif"
    ctx.fillText(fullDayLabel(dateStr), PAD, 52)

    ctx.fillStyle = "#9B8F80"
    ctx.font = "13px sans-serif"
    ctx.fillText(
      `${evs.length}건`,
      PAD + ctx.measureText(fullDayLabel(dateStr)).width + 8,
      52
    )

    ctx.strokeStyle = "#E5DDD0"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, HEADER_H)
    ctx.lineTo(W, HEADER_H)
    ctx.stroke()

    if (evs.length === 0) {
      ctx.fillStyle = "#9B8F80"
      ctx.font = "14px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText("일정이 없습니다.", W / 2, HEADER_H + ROW_H / 2)
      ctx.textAlign = "left"
    }

    evs.forEach((ev, i) => {
      const y = HEADER_H + i * ROW_H

      if (i > 0) {
        ctx.strokeStyle = "#EDE5DC"
        ctx.lineWidth = 0.5
        ctx.beginPath()
        ctx.moveTo(PAD, y)
        ctx.lineTo(W - PAD, y)
        ctx.stroke()
      }

      const isCustom = ev.category === "custom"
      const hex =
        isCustom && ev.custom_color
          ? ev.custom_color
          : CATEGORY_HEX[ev.category]?.bg ?? "#9CA3AF"
      const label = eventDisplayLabel(ev)

      const badgeX = PAD
      const badgeY = y + ROW_H / 2 - 9
      ctx.font = "bold 11px sans-serif"
      const badgeW = ctx.measureText(label).width + 16
      ctx.fillStyle = hex + "26"
      roundRect(ctx, badgeX, badgeY, badgeW, 18, 9)
      ctx.fillStyle = hex
      ctx.fillText(label, badgeX + 8, badgeY + 13)

      const titleX = badgeX + badgeW + 10
      ctx.fillStyle = "#2C2C2A"
      ctx.font = "500 14px sans-serif"
      const maxTitleW = W - titleX - PAD - 80
      ctx.fillText(
        truncateText(ctx, getEventTitle(ev), maxTitleW),
        titleX,
        y + ROW_H / 2 - 2
      )

      ctx.fillStyle = "#9B8F80"
      ctx.font = "12px sans-serif"
      ctx.fillText(formatRange(ev), titleX, y + ROW_H / 2 + 14)

      if (ev.signup_enabled && ev.signup_count > 0) {
        const signupText = `신청 ${ev.signup_count}`
        ctx.font = "bold 11px sans-serif"
        const signupW = ctx.measureText(signupText).width + 12
        const signupX = W - PAD - signupW
        ctx.fillStyle = "#E87C3E26"
        roundRect(ctx, signupX, y + ROW_H / 2 - 9, signupW, 18, 9)
        ctx.fillStyle = "#E87C3E"
        ctx.fillText(signupText, signupX + 6, y + ROW_H / 2 + 4)
      }
    })

    ctx.fillStyle = "#C4B8AC"
    ctx.font = "11px sans-serif"
    ctx.fillText("wangwangland.kr", PAD, totalH - 12)

    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error("canvas toBlob 실패"))
    }, "image/png")
  })
}

// ────────────────────────────────────────────────────────────
// 한 달 전체 공유
// ────────────────────────────────────────────────────────────
export function buildMonthShareText(
  yearMonth: string,
  events: EventWithSignupCount[]
): string {
  const [y, m] = yearMonth.split("-").map(Number)
  const header = `📅 ${y}년 ${m}월 왕왕랜드 일정 (${events.length}건)`

  // 날짜별 그룹
  const grouped: Record<string, EventWithSignupCount[]> = {}
  for (const ev of events) {
    const key = isoToDateKey(ev.starts_at)
    ;(grouped[key] ??= []).push(ev)
  }
  const dates = Object.keys(grouped).sort()

  if (dates.length === 0) return `${header}\n\n등록된 일정이 없습니다.`

  const sections = dates.map((d) => {
    const lines = grouped[d].map((ev) => {
      const label = eventDisplayLabel(ev)
      const time = formatRange(ev)
      const signup =
        ev.signup_enabled && ev.signup_count > 0 ? ` (신청 ${ev.signup_count}명)` : ""
      return `  • ${time} [${label}] ${getEventTitle(ev)}${signup}`
    })
    return [`▸ ${fullDayLabel(d)}`, ...lines].join("\n")
  })
  return [header, "", ...sections].join("\n")
}

export function buildMonthShareImage(
  yearMonth: string,
  events: EventWithSignupCount[]
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const SCALE = 2
    const W = 720
    const HEADER_H = 88
    const DAY_HEADER_H = 36
    const ROW_H = 50
    const FOOTER_H = 40
    const PAD = 28

    const [y, m] = yearMonth.split("-").map(Number)

    const grouped: Record<string, EventWithSignupCount[]> = {}
    for (const ev of events) {
      const key = isoToDateKey(ev.starts_at)
      ;(grouped[key] ??= []).push(ev)
    }
    const dates = Object.keys(grouped).sort()

    const bodyH = dates.length === 0
      ? 80
      : dates.reduce(
          (sum, d) => sum + DAY_HEADER_H + grouped[d].length * ROW_H,
          0
        )
    const totalH = HEADER_H + bodyH + FOOTER_H

    const canvas = document.createElement("canvas")
    canvas.width = W * SCALE
    canvas.height = totalH * SCALE
    const ctx = canvas.getContext("2d")!
    ctx.scale(SCALE, SCALE)

    // 배경
    ctx.fillStyle = "#FAF6F0"
    ctx.fillRect(0, 0, W, totalH)

    // 헤더 영역
    ctx.fillStyle = "#2A3D2F"
    ctx.fillRect(0, 0, W, HEADER_H)

    // 헤더 텍스트
    ctx.fillStyle = "#F5EDE0"
    ctx.font = "bold 13px sans-serif"
    ctx.fillText("🐾 왕왕랜드", PAD, 30)

    ctx.fillStyle = "#FFFFFF"
    ctx.font = "bold 26px sans-serif"
    ctx.fillText(`${y}년 ${m}월 일정`, PAD, 64)

    ctx.fillStyle = "#9AB09E"
    ctx.font = "13px sans-serif"
    const headerLabel = `${y}년 ${m}월 일정`
    ctx.fillText(
      `총 ${events.length}건`,
      PAD + ctx.measureText(headerLabel).width + 12,
      64
    )

    // 본문
    if (dates.length === 0) {
      ctx.fillStyle = "#9B8F80"
      ctx.font = "14px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText("등록된 일정이 없습니다.", W / 2, HEADER_H + 50)
      ctx.textAlign = "left"
    } else {
      let cy = HEADER_H
      dates.forEach((d) => {
        // 날짜 헤더
        ctx.fillStyle = "#F0E8DC"
        ctx.fillRect(0, cy, W, DAY_HEADER_H)

        ctx.fillStyle = "#2C2C2A"
        ctx.font = "bold 14px sans-serif"
        ctx.fillText(fullDayLabel(d), PAD, cy + 23)

        ctx.fillStyle = "#9B8F80"
        ctx.font = "12px sans-serif"
        const dayLabelW = ctx.measureText(fullDayLabel(d)).width
        ctx.font = "bold 14px sans-serif"
        ctx.fillStyle = "#9B8F80"
        ctx.font = "12px sans-serif"
        ctx.fillText(`${grouped[d].length}건`, PAD + dayLabelW + 8, cy + 23)
        cy += DAY_HEADER_H

        grouped[d].forEach((ev, i) => {
          if (i > 0) {
            ctx.strokeStyle = "#EDE5DC"
            ctx.lineWidth = 0.5
            ctx.beginPath()
            ctx.moveTo(PAD, cy)
            ctx.lineTo(W - PAD, cy)
            ctx.stroke()
          }

          const isCustom = ev.category === "custom"
          const hex =
            isCustom && ev.custom_color
              ? ev.custom_color
              : CATEGORY_HEX[ev.category]?.bg ?? "#9CA3AF"
          const label = eventDisplayLabel(ev)

          const badgeX = PAD
          const badgeY = cy + ROW_H / 2 - 9
          ctx.font = "bold 11px sans-serif"
          const badgeW = ctx.measureText(label).width + 16
          ctx.fillStyle = hex + "26"
          roundRect(ctx, badgeX, badgeY, badgeW, 18, 9)
          ctx.fillStyle = hex
          ctx.fillText(label, badgeX + 8, badgeY + 13)

          const titleX = badgeX + badgeW + 10
          ctx.fillStyle = "#2C2C2A"
          ctx.font = "500 13px sans-serif"
          const maxTitleW = W - titleX - PAD - 110
          ctx.fillText(
            truncateText(ctx, getEventTitle(ev), maxTitleW),
            titleX,
            cy + ROW_H / 2 - 2
          )

          ctx.fillStyle = "#9B8F80"
          ctx.font = "11px sans-serif"
          ctx.fillText(formatRange(ev), titleX, cy + ROW_H / 2 + 12)

          if (ev.signup_enabled && ev.signup_count > 0) {
            const signupText = `신청 ${ev.signup_count}`
            ctx.font = "bold 11px sans-serif"
            const signupW = ctx.measureText(signupText).width + 12
            const signupX = W - PAD - signupW
            ctx.fillStyle = "#E87C3E26"
            roundRect(ctx, signupX, cy + ROW_H / 2 - 9, signupW, 18, 9)
            ctx.fillStyle = "#E87C3E"
            ctx.fillText(signupText, signupX + 6, cy + ROW_H / 2 + 4)
          }

          cy += ROW_H
        })
      })
    }

    // 푸터
    ctx.fillStyle = "#C4B8AC"
    ctx.font = "11px sans-serif"
    ctx.fillText("wangwangland.kr", PAD, totalH - 14)

    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error("canvas toBlob 실패"))
    }, "image/png")
  })
}

// 컬러 변수 — UI 컴포넌트에서 사용
export { CATEGORY_COLOR, customColorStyle }
