"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { ThemeToggle } from "@/shared/components/theme-toggle"
import { AdminNotificationBell } from "@/shared/components/admin-notification-bell"
import type { PendingCounts } from "@/shared/lib/pending-counts"
import { cn } from "@/shared/lib/utils"
import { HeaderProfile } from "@/shared/components/header-profile"
import { MobileHeaderMenu } from "@/shared/components/mobile-header-menu"

type NavGroup = {
  label: string
  items: { label: string; href: string }[]
}


interface AdminHeaderProps {
  siteName: string
  adminName: string
  adminRole: string
  adminAvatarUrl?: string | null
  isTopAdmin: boolean
  logoutAction: () => Promise<void>
  pendingCounts: PendingCounts
}

export function buildNavGroups(isTopAdmin: boolean): NavGroup[] {
  return [
    { label: "신청·일정 관리", items: [
      { label: "봉사 신청", href: "/admin/applications?type=volunteer" },
      { label: "입양 상담 신청", href: "/admin/applications?type=adoption" },
      { label: "전체 일정", href: "/admin/calendar" }, { label: "운영진 일정", href: "/admin/schedule" },
    ] },
    { label: "아이들 관리", items: [{ label: "강아지", href: "/admin/dogs" }, { label: "고양이", href: "/admin/cats" }] },
    { label: "게시글 관리", items: [{ label: "공지사항", href: "/admin/notices" }, { label: "왕왕랜드 이야기", href: "/admin/community" }, { label: "지출 내역", href: "/admin/expenses" }] },
    { label: "후원 관리", items: [{ label: "후원 내역", href: "/admin/donations" }] },
    { label: "회원 관리", items: [{ label: "회원", href: "/admin/members" }, ...(isTopAdmin ? [{ label: "운영진", href: "/admin/admins" }] : [])] },
    { label: "홈페이지 관리", items: [{ label: "사이트 사진", href: "/admin/settings/photos" }, { label: "홈 노출 아이들", href: "/admin/settings/animals" }, { label: "팝업", href: "/admin/settings/popups" }] },
    { label: "운영 설정", items: [{ label: "배송 안내", href: "/admin/settings/delivery" }, { label: "연락처·SNS", href: "/admin/settings/contact" }, { label: "후원 계좌", href: "/admin/settings/account" }] },
    { label: "시스템 관리", items: [{ label: "SMS 발송 내역", href: "/admin/sms" }, ...(isTopAdmin ? [{ label: "오류 로그", href: "/admin/logs" }, { label: "점검 모드", href: "/admin/settings/maintenance" }] : [])] },
  ]
}

const menuLinkClass = "relative flex min-h-11 items-center rounded-xl border border-transparent px-3 text-sm text-admin-nav-foreground transition-[color,background-color,border-color,box-shadow] duration-200 hover:border-white/15 hover:bg-white/[0.08] hover:text-white hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-admin-nav motion-reduce:transition-none"
const selectedClass = "border-white/15 bg-white/[0.08] font-semibold text-white before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:rounded-full before:bg-current"

function AdminMenuContent({ isTopAdmin, logoutAction, onNavigate }: AdminHeaderProps & { onNavigate?: () => void }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isActive = (href: string) => {
    const [path, query] = href.split("?")
    if (path === "/admin") return pathname === path
    if (path === "/admin/applications") {
      if (pathname !== path && !pathname.startsWith(`${path}/`)) return false
      const type = pathname.startsWith(`${path}/adoption/`) ? "adoption" : pathname.startsWith(`${path}/volunteer/`) ? "volunteer" : searchParams.get("type") ?? "volunteer"
      return new URLSearchParams(query).get("type") === type
    }
    if (path === "/admin/community" && ["/admin/daily", "/admin/stories", "/admin/thanks"].some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))) return true
    if (pathname !== path && !pathname.startsWith(`${path}/`)) return false
    return !query || Array.from(new URLSearchParams(query).entries()).every(([key, value]) => searchParams.get(key) === value)
  }

  return <>
    <div className="p-4">
      <nav className="space-y-2" aria-label="관리자 메뉴" onClick={event => {
        if ((event.target as HTMLElement).closest("a")) onNavigate?.()
      }}>
        <Link href="/admin" aria-current={isActive("/admin") ? "page" : undefined} className={cn(menuLinkClass, isActive("/admin") && selectedClass)}>대시보드</Link>
        {buildNavGroups(isTopAdmin).map(group => (
          <details key={`${group.label}-${pathname}-${searchParams.toString()}`} open={group.items.some(item => isActive(item.href))} className="group/menu rounded-xl transition-colors open:bg-white/[0.06] open:pb-2 motion-reduce:transition-none">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-lg px-3 text-sm font-semibold text-admin-nav-muted transition-colors hover:bg-white/[0.10] hover:text-white group-open/menu:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 [&::-webkit-details-marker]:hidden">{group.label}<span aria-hidden className="hidden text-lg group-open/menu:inline">−</span></summary>
            <ul className="mx-3 mt-1 grid gap-1 border-l border-white/15 pl-2">
              {group.items.map(item => <li key={item.href}>
                <Link href={item.href} aria-current={isActive(item.href) ? "page" : undefined} className={cn(menuLinkClass, isActive(item.href) && selectedClass)}>
                  {item.label}
                </Link>
              </li>)}
            </ul>
          </details>
        ))}
      </nav>
    </div>
    <form action={logoutAction} className="shrink-0 px-4 pb-4 pt-2">
      <button type="submit" className={cn(menuLinkClass, "w-full justify-center text-admin-nav-muted")}>로그아웃</button>
    </form>
  </>
}

export function AdminSidebar(props: AdminHeaderProps) {
  return <aside aria-label="관리자 사이드메뉴" className="hidden min-w-0 self-start flex-col rounded-[26px] border border-admin-nav-border bg-admin-nav shadow-sm md:flex">
    <AdminMenuContent {...props} />
  </aside>
}

export function AdminHeader(props: AdminHeaderProps) {
  const account = <HeaderProfile name={props.adminName} avatarUrl={props.adminAvatarUrl} />
  const homeLink = <Link href="/" className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">메인 페이지</Link>
  return <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
    <div className="mx-auto grid h-16 w-full max-w-[1440px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-4 md:flex md:h-20 md:justify-between md:px-6 lg:px-8">
      <div className="justify-self-start md:hidden">
        <MobileHeaderMenu title="왕왕랜드 관리자 메뉴">
          <div className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card p-3">{account}<ThemeToggle /></div>
          <div className="mt-2">{homeLink}</div>
          <div className="mt-3 rounded-2xl bg-admin-nav"><AdminMenuContent {...props} /></div>
        </MobileHeaderMenu>
      </div>
      <Link href="/admin" className="flex min-h-11 items-center whitespace-nowrap rounded-lg text-base font-semibold tracking-tight md:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">왕왕랜드 관리자</Link>
      <div className="flex min-w-0 items-center justify-self-end gap-2">
        <div className="hidden md:block">{homeLink}</div>
        <div className="hidden md:block"><ThemeToggle /></div>
        <AdminNotificationBell counts={props.pendingCounts} />
        <div className="hidden min-w-0 md:block">{account}</div>
      </div>
    </div>
  </header>
}
