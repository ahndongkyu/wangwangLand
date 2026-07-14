"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, ClipboardList, CalendarDays, Bell } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import type { PendingCounts } from "@/shared/lib/pending-counts"

interface Props {
  counts: PendingCounts
}

const HOME_TAB = { label: "대시보드", icon: LayoutDashboard, href: "/admin", exact: true } as const
const REST_TABS = [
  { label: "신청", icon: ClipboardList, href: "/admin/applications", exact: false },
  { label: "일정", icon: CalendarDays, href: "/admin/calendar", exact: false },
  { label: "알림", icon: Bell, href: "/admin/members", exact: false },
] as const

export function AdminBottomNav({ counts }: Props) {
  const pathname = usePathname()

  function renderTabLink<T extends { label: string; icon: typeof Bell; href: string }>(
    tab: T,
    isActive: boolean,
    badge = 0
  ) {
    const Icon = tab.icon
    return (
      <Link
        href={tab.href}
        className={cn(
          "flex flex-col items-center justify-center gap-1 rounded-md px-1 py-2.5 text-[11px] font-semibold transition-colors",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        )}
      >
        <span className="relative">
          <Icon className="size-6" />
          {badge > 0 && (
            <span className="absolute -right-1.5 -top-1 flex min-w-[14px] items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] font-bold leading-none text-destructive-foreground">
              {badge > 9 ? "9+" : badge}
            </span>
          )}
        </span>
        {tab.label}
      </Link>
    )
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur px-2 pb-[max(env(safe-area-inset-bottom),16px)] pt-2.5 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] md:hidden">
      <ul className="grid grid-cols-4 gap-1">
        {/* 대시보드 (항상 첫 칸) */}
        <li>{renderTabLink(HOME_TAB, pathname === HOME_TAB.href)}</li>

        {/* 나머지 메인 탭들 */}
        {REST_TABS.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/")
          const badge = tab.href === "/admin/members" ? counts.total : 0
          return <li key={tab.href}>{renderTabLink(tab, isActive, badge)}</li>
        })}
      </ul>
    </nav>
  )
}
