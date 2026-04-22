"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { BrandIcon, type BrandIconName } from "@/shared/components/brand-icon"
import { cn } from "@/shared/lib/utils"

interface CtaItem {
  label: string
  icon: BrandIconName
  href: string
  primary?: boolean
}

const ITEMS: CtaItem[] = [
  { label: "입양 문의", icon: "paw", href: "/adopt", primary: true },
  { label: "봉사 신청", icon: "volunteer", href: "/volunteer" },
  { label: "후원하기", icon: "heart", href: "/donate" },
]

/**
 * 모바일에서만 노출되는 하단 고정 CTA.
 * 로그인 폼·신청 폼 등에서 자체 CTA 와 충돌하지 않도록 일부 경로에서 숨김.
 */
export function MobileCtaBar() {
  const pathname = usePathname()

  // 어드민 / 작성·수정 폼 / CTA 본문 페이지에서는 숨김
  const hiddenPrefixes = ["/admin", "/adopt", "/volunteer", "/donate"]
  if (hiddenPrefixes.some((p) => pathname.startsWith(p))) return null

  return (
    <nav
      aria-label="빠른 참여"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-3 gap-1.5">
        {ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 rounded-md px-2 py-2 text-[11px] font-semibold transition-colors",
                item.primary
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "text-foreground/80 hover:bg-secondary"
              )}
            >
              <BrandIcon name={item.icon} size={22} decorative />
              <span>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
