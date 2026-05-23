"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, Heart, Package } from "lucide-react"

import type { DonationThanks } from "../types"
import { stripHtml } from "@/shared/lib/utils"
import { cn } from "@/shared/lib/utils"

const CARD_W = 268 // px — card 기본 너비
const GAP = 16 // px — gap-4

interface Props {
  items: DonationThanks[]
  /** 자동 넘김 간격 ms (기본 4500) */
  interval?: number
}

// ── 카드 1장 ──────────────────────────────────────────────────────────────────
function ThanksSlideCard({ item }: { item: DonationThanks }) {
  const thumbnail = item.images[item.thumbnail_index] ?? item.images[0] ?? null
  const excerpt = stripHtml(item.content).slice(0, 90).trim()
  const date = item.published_at
    ? new Date(item.published_at).toLocaleDateString("ko-KR", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-shadow hover:shadow-md">
      {/* 이미지 / 플레이스홀더 */}
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={item.donor_display_name ? `${item.donor_display_name} 님 후원` : "후원 감사"}
            fill
            sizes="(max-width: 640px) 80vw, 300px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/8 to-primary/18">
            <Heart
              className="size-14 fill-primary/20 stroke-primary/35"
              strokeWidth={1.5}
            />
          </div>
        )}
      </div>

      {/* 텍스트 */}
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        {item.donor_display_name && (
          <p className="text-sm font-semibold text-foreground">
            💛 {item.donor_display_name} 님
          </p>
        )}
        {item.donation_summary && (
          <p className="flex items-center gap-1 text-xs font-medium text-primary">
            <Package className="size-3 shrink-0" aria-hidden />
            {item.donation_summary}
          </p>
        )}
        {excerpt && (
          <p className="mt-0.5 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
            {excerpt}
          </p>
        )}
        {date && (
          <p className="mt-auto pt-1.5 text-[10px] text-muted-foreground/50">
            {date}
          </p>
        )}
      </div>
    </article>
  )
}

// ── 슬라이더 ──────────────────────────────────────────────────────────────────
export function ThanksSlider({ items, interval = 4500 }: Props) {
  const [current, setCurrent] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const count = items.length

  /** idx 번째 카드로 스크롤 */
  const goTo = useCallback(
    (idx: number) => {
      const n = (idx + count) % count
      const track = trackRef.current
      if (!track) return
      track.scrollTo({ left: n * (CARD_W + GAP), behavior: "smooth" })
      setCurrent(n)
    },
    [count]
  )

  const goNext = useCallback(() => goTo(current + 1), [current, goTo])
  const goPrev = useCallback(() => goTo(current - 1), [current, goTo])

  // 자동 넘김
  useEffect(() => {
    if (count <= 1) return
    timerRef.current = setTimeout(goNext, interval)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [current, goNext, interval, count])

  if (!items.length) return null

  return (
    <div className="relative select-none">
      {/* 트랙 — overflow-hidden 으로 옆 카드 클리핑 */}
      <div className="overflow-hidden">
        <div
          ref={trackRef}
          className="flex gap-4 overflow-x-scroll pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => (
            <div
              key={item.id}
              className="w-[268px] shrink-0"
            >
              <ThanksSlideCard item={item} />
            </div>
          ))}
        </div>
      </div>

      {/* 컨트롤 — 2개 이상일 때만 */}
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

          {/* 도트 */}
          <div className="flex items-center gap-1.5" role="tablist">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === current}
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
