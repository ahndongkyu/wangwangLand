"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Heart, Banknote, Package } from "lucide-react"

import type { Donation } from "../api/queries"
import { maskName } from "@/shared/lib/utils"
import { cn } from "@/shared/lib/utils"

const CARD_W = 220 // px
const GAP = 12 // px — gap-3

interface Props {
  items: Donation[]
  interval?: number
}

// ── 이름 표시 결정 ─────────────────────────────────────────────────────────────
function resolveDisplayName(d: Donation): string {
  if (d.is_anonymous) return "익명"
  if (d.display_name?.trim()) return maskName(d.display_name.trim())
  // 없으면 실명 마스킹
  return maskName(d.donor_name)
}

// ── 후원 내용 한 줄 요약 ───────────────────────────────────────────────────────
function resolveSummary(d: Donation): string {
  if (d.type === "cash" && d.amount) {
    return `${d.amount.toLocaleString()}원`
  }
  if (d.type === "goods") {
    const parts = [d.item_description, d.item_quantity].filter(Boolean)
    return parts.join(" · ") || "물품 후원"
  }
  return "후원"
}

// ── 카드 1장 ───────────────────────────────────────────────────────────────────
function DonationCard({ item }: { item: Donation }) {
  const displayName = resolveDisplayName(item)
  const summary = resolveSummary(item)
  const isCash = item.type === "cash"
  const date = item.approved_at
    ? new Date(item.approved_at).toLocaleDateString("ko-KR", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      {/* 아이콘 영역 */}
      <div
        className={cn(
          "flex items-center justify-center py-7",
          isCash
            ? "bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20"
            : "bg-gradient-to-br from-primary/6 to-primary/16"
        )}
      >
        {isCash ? (
          <Banknote
            className="size-10 text-amber-500/70 dark:text-amber-400/60"
            strokeWidth={1.5}
          />
        ) : (
          <Package
            className="size-10 text-primary/50"
            strokeWidth={1.5}
          />
        )}
      </div>

      {/* 텍스트 */}
      <div className="flex flex-1 flex-col items-center gap-1.5 px-3 py-4 text-center">
        {/* 후원 내용 */}
        <p
          className={cn(
            "text-sm font-bold",
            isCash ? "text-amber-600 dark:text-amber-400" : "text-primary"
          )}
        >
          {summary}
        </p>

        {/* 후원자명 */}
        <p className="text-xs font-semibold text-foreground">
          {displayName} 님
        </p>

        {/* 메시지 */}
        {item.message && (
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
            "{item.message}"
          </p>
        )}

        {/* 날짜 */}
        {date && (
          <p className="mt-auto pt-2 text-[10px] text-muted-foreground/50">
            {date}
          </p>
        )}
      </div>
    </article>
  )
}

// ── 슬라이더 ───────────────────────────────────────────────────────────────────
export function DonationSlider({ items, interval = 4000 }: Props) {
  const [current, setCurrent] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const count = items.length

  const goTo = useCallback(
    (idx: number) => {
      const n = (idx + count) % count
      trackRef.current?.scrollTo({ left: n * (CARD_W + GAP), behavior: "smooth" })
      setCurrent(n)
    },
    [count]
  )

  const goNext = useCallback(() => goTo(current + 1), [current, goTo])
  const goPrev = useCallback(() => goTo(current - 1), [current, goTo])

  useEffect(() => {
    if (count <= 1) return
    timerRef.current = setTimeout(goNext, interval)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [current, goNext, interval, count])

  if (!items.length) return null

  return (
    <div className="relative select-none">
      <div className="overflow-hidden">
        <div
          ref={trackRef}
          className="flex gap-3 overflow-x-scroll pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => (
            <div key={item.id} className="w-[220px] shrink-0">
              <DonationCard item={item} />
            </div>
          ))}
        </div>
      </div>

      {count > 1 && (
        <div className="mt-5 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={goPrev}
            className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            aria-label="이전"
          >
            <ChevronLeft className="size-4" />
          </button>

          <div className="flex items-center gap-1.5">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === current
                    ? "w-5 bg-primary"
                    : "w-1.5 bg-border hover:bg-primary/40"
                )}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={goNext}
            className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            aria-label="다음"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  )
}
