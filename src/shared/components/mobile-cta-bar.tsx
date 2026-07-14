"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { BrandIcon, type BrandIconName } from "@/shared/components/brand-icon"
import { cn } from "@/shared/lib/utils"

interface CtaItem {
  label: string
  icon: BrandIconName
  href: string
}

const HOME: CtaItem = { label: "홈", icon: "nav-home", href: "/" }
const REST: CtaItem[] = [
  { label: "입양 문의", icon: "paw", href: "/adopt" },
  { label: "봉사 신청", icon: "volunteer", href: "/volunteer" },
  { label: "후원하기", icon: "heart", href: "/donate" },
]
/**
 * 모바일에서만 노출되는 하단 고정 내비게이션.
 * - 모든 경로: 4탭 (홈/입양/봉사/후원)
 * 어드민 경로에서는 숨김.
 */
export function MobileCtaBar() {
  const pathname = usePathname()

  if (pathname.startsWith("/admin")) return null

  return (
    <nav
      aria-label="하단 내비게이션"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-2 pb-[max(env(safe-area-inset-bottom),16px)] pt-2.5 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-4 gap-1">
        {/* 홈 */}
        <li>
          <Link
            href={HOME.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-md px-1 py-2.5 text-[11px] font-semibold transition-colors",
              pathname === "/"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <BrandIcon name={HOME.icon} size={24} decorative />
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
                  "flex flex-col items-center justify-center gap-1 rounded-md px-1 py-2.5 text-[11px] font-semibold transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <BrandIcon name={item.icon} size={24} decorative />
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
