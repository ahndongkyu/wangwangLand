"use client"

import { Suspense, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { mobileHeaderReturnHref, mobileHeaderRoute } from "@/shared/lib/mobile-header-navigation"

export function MobileHeaderTitle({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={children}><MobileHeaderTitleContent>{children}</MobileHeaderTitleContent></Suspense>
}

function MobileHeaderTitleContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const query = useSearchParams().toString()
  const router = useRouter()
  const previous = useRef<string | null>(null)
  const current = useRef<string | null>(null)
  useEffect(() => {
    const href = `${window.location.pathname}${window.location.search}${window.location.hash}`
    if (current.current !== href) { previous.current = current.current; current.current = href }
  }, [pathname, query])
  const route = mobileHeaderRoute(pathname)
  if (!route) return children
  return <div className="flex min-w-0 items-center gap-1">
    <Link href={route.href} aria-label="뒤로가기" className="flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
      event.preventDefault()
      const explicit = new URLSearchParams(window.location.search).get("returnTo")
      const destination = mobileHeaderReturnHref(route, explicit ?? previous.current)
      // 내부 목록에서 들어온 경우에는 스크롤·검색 조건을 포함한 이력을 복원한다.
      if (previous.current === destination && window.history.length > 1) router.back()
      else router.replace(destination)
    }}><ChevronLeft className="size-5" aria-hidden /></Link>
    <span className="min-w-0 truncate text-base font-semibold">{route.title}</span>
  </div>
}
