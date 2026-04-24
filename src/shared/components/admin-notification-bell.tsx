"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Bell, Users, Heart, HandHeart } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import type { PendingCounts } from "@/shared/lib/pending-counts"

interface Props {
  counts: PendingCounts
}

export function AdminNotificationBell({ counts }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const hasItems = counts.total > 0

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const items = [
    counts.members > 0 && {
      icon: <Users className="size-4 shrink-0 text-amber-600" />,
      label: "회원 승인 대기",
      count: counts.members,
      href: "/admin/members?status=pending",
      color: "text-amber-600",
    },
    counts.adoptions > 0 && {
      icon: <Heart className="size-4 shrink-0 text-rose-500" />,
      label: "입양 신청 접수",
      count: counts.adoptions,
      href: "/admin/applications?type=adoption&status=접수",
      color: "text-rose-500",
    },
    counts.volunteers > 0 && {
      icon: <HandHeart className="size-4 shrink-0 text-primary" />,
      label: "봉사 신청 접수",
      count: counts.volunteers,
      href: "/admin/applications?type=volunteer&status=접수",
      color: "text-primary",
    },
  ].filter(Boolean) as Array<{
    icon: React.ReactNode
    label: string
    count: number
    href: string
    color: string
  }>

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => hasItems && setOpen((v) => !v)}
        className={cn(
          "relative flex size-9 items-center justify-center rounded-full transition-colors",
          hasItems
            ? "text-foreground/70 hover:bg-secondary hover:text-foreground"
            : "text-foreground/40 cursor-default"
        )}
        aria-label={hasItems ? `처리 대기 알림 ${counts.total}건` : "대기 알림 없음"}
      >
        <Bell className="size-5" />
        {hasItems && (
          <span className="absolute right-0.5 top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 py-px text-[10px] font-bold leading-none text-destructive-foreground">
            {counts.total > 99 ? "99+" : counts.total}
          </span>
        )}
      </button>

      {open && hasItems && (
        <div className="absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
          <div className="border-b border-border px-4 py-2.5">
            <p className="text-xs font-semibold text-muted-foreground">처리 대기 알림</p>
          </div>
          <ul className="p-1">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-secondary"
                >
                  {item.icon}
                  <span className="flex-1 text-sm text-foreground">{item.label}</span>
                  <span className={`text-sm font-bold ${item.color}`}>
                    {item.count}건
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
