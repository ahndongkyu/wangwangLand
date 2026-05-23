"use client"

import Link from "next/link"
import { Heart } from "lucide-react"
import type { Donation } from "../api/queries"
import { maskName } from "@/shared/lib/utils"

interface Props {
  items: Donation[]
  speed?: number
}

function resolveDisplayName(d: Donation): string {
  if (d.is_anonymous) return "익명"
  if (d.display_name?.trim()) return maskName(d.display_name.trim())
  return maskName(d.donor_name)
}

function resolveSummary(d: Donation): string {
  if (d.type === "cash" && d.amount)
    return `${d.amount.toLocaleString()}원`
  if (d.type === "goods") {
    const parts = [d.item_description, d.item_quantity].filter(Boolean)
    return parts.join(" ") || "물품 후원"
  }
  return "후원"
}

function TickerItem({ item }: { item: Donation }) {
  const name = resolveDisplayName(item)
  const summary = resolveSummary(item)
  const isCash = item.type === "cash"

  return (
    <span className="inline-flex items-center gap-2 px-4">
      <Heart className="size-2.5 shrink-0 fill-primary/30 text-primary/30" aria-hidden />
      <span className="whitespace-nowrap text-xs">
        <span className="font-semibold text-foreground/80">{name}</span>
        <span className="mx-1 text-muted-foreground/60">·</span>
        <span className={isCash ? "text-amber-500 dark:text-amber-400" : "text-primary/80"}>
          {summary}
        </span>
      </span>
    </span>
  )
}

export function DonationTicker({ items, speed = 6 }: Props) {
  if (!items.length) return null

  const minRepeat = Math.ceil(12 / items.length)
  const repeated = Array.from({ length: Math.max(minRepeat, 2) }, () => items).flat()
  const doubled = [...repeated, ...repeated]
  const duration = repeated.length * speed

  return (
    <div
      className="border-y border-border/50 bg-primary/[0.03]"
      aria-label="최근 후원 현황"
    >
      <div className="mx-auto flex w-full max-w-6xl items-center px-4 md:px-6 2xl:max-w-7xl">
      {/* 왼쪽 고정 라벨 */}
      <div className="flex shrink-0 items-center gap-2 border-r border-border/50 bg-background/60 px-3 py-2.5 backdrop-blur-sm">
        <span className="relative flex size-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-rose-500" />
        </span>
        <span className="whitespace-nowrap text-xs font-semibold text-foreground/70">
          실시간 후원
        </span>
      </div>

      {/* 티커 (양쪽 페이드) */}
      <div className="relative min-w-0 flex-1 overflow-hidden py-2.5">
        {/* 왼쪽 페이드 */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-background to-transparent" />
        {/* 오른쪽 페이드 */}
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-background to-transparent" />

        <div
          className="flex w-max animate-ticker"
          style={{ animationDuration: `${duration}s` }}
        >
          {doubled.map((item, i) => (
            <TickerItem key={`${item.id}-${i}`} item={item} />
          ))}
        </div>
      </div>

      {/* 오른쪽 고정 CTA — 모바일 숨김 */}
      <div className="hidden shrink-0 border-l border-border/50 px-3 py-2 sm:block">
        <Link
          href="/donate"
          className="whitespace-nowrap rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          나도 후원하기 →
        </Link>
      </div>
      </div>
    </div>
  )
}
