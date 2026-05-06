"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, ClipboardList, CalendarDays, Bell } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import type { PendingCounts } from "@/shared/lib/pending-counts"

interface Props {
  counts: PendingCounts
}

const TABS = [
  { label: "대시보드", icon: LayoutDashboard, href: "/admin", exact: true },
  { label: "신청", icon: ClipboardList, href: "/admin/applications", exact: false },
  { label: "일정", icon: CalendarDays, href: "/admin/calendar", exact: false },
  { label: "알림", icon: Bell, href: "/admin/members", exact: false },
] as const

export function AdminBottomNav({ counts }: Props) {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur pb-[max(env(safe-area-inset-bottom),4px)] md:hidden">
      <ul className="grid grid-cols-4">
        {TABS.map((tab) => {
          const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href)
          const Icon = tab.icon
          const badge = tab.href === "/admin/members" ? counts.total : 0
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <span className="relative">
                  <Icon className="size-5" />
                  {badge > 0 && (
                    <span className="absolute -right-1.5 -top-1 flex min-w-[14px] items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] font-bold leading-none text-destructive-foreground">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </span>
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
