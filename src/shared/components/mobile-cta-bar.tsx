"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/shared/lib/utils"

interface CtaItem {
  label: string
  href: string
}

const HOME: CtaItem = { label: "홈", href: "/" }
const REST: CtaItem[] = [
  { label: "이야기", href: "/daily" },
  { label: "봉사 신청", href: "/volunteer" },
  { label: "활동 일정", href: "/calendar" },
]

const FOCUSED_ROUTES = [
  "/agreement",
  "/login",
  "/onboarding",
  "/pending",
  "/privacy",
  "/profile",
  "/rejected",
  "/terms",
]

function shouldHide(pathname: string): boolean {
  const isFocused = FOCUSED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
  const isAnimalDetail = /^\/(dogs|cats)\/[^/]+\/?$/.test(pathname)
  return pathname.startsWith("/admin") || isFocused || isAnimalDetail
}
/**
 * 모바일에서만 노출되는 하단 고정 내비게이션.
 * - 일반 화면: 4탭 (홈/이야기/봉사/일정)
 * - 집중형 화면·동물 상세·어드민 경로에서는 숨김.
 */
export function MobileCtaBar() {
  const pathname = usePathname()
  if (shouldHide(pathname)) return null

  return (
    <nav
      aria-label="하단 내비게이션"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-2 pb-[max(env(safe-area-inset-bottom),16px)] pt-2.5 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-4 gap-1">
        {/* 홈 */}
        <li>
          <Link
            href={HOME.href}
            className={cn(
              "flex min-h-11 items-center justify-center rounded-md px-1 py-2.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              pathname === HOME.href
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <span>{HOME.label}</span>
          </Link>
        </li>

        {/* 입양/봉사/후원 */}
        {REST.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex min-h-11 items-center justify-center rounded-md px-1 py-2.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
