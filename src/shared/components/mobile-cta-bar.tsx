"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

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
const ALL_MAIN_HREFS = ["/", ...REST.map((r) => r.href)]

/**
 * 모바일에서만 노출되는 하단 고정 내비게이션.
 * - 메인 경로: 4탭 (홈/입양/봉사/후원)
 * - 그 외 페이지: 5칸 (홈 / ← 뒤로 / 입양 / 봉사 / 후원)
 * 어드민 경로에서는 숨김.
 */
export function MobileCtaBar() {
  const pathname = usePathname()
  const router = useRouter()

  if (pathname.startsWith("/admin")) return null

  const isOnMain = ALL_MAIN_HREFS.includes(pathname)

  return (
    <nav
      aria-label="하단 내비게이션"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-2 pb-[max(env(safe-area-inset-bottom),16px)] pt-2.5 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur md:hidden"
    >
      <ul className={cn("grid gap-1", isOnMain ? "grid-cols-4" : "grid-cols-5")}>
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

        {/* 서브 페이지에서만 뒤로가기 */}
        {!isOnMain && (
          <li>
            <button
              type="button"
              onClick={() => router.back()}
              className="flex w-full flex-col items-center justify-center gap-1 rounded-md px-1 py-2.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="이전 페이지로"
            >
              <ArrowLeft className="size-6" />
              <span>뒤로</span>
            </button>
          </li>
        )}

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
