"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight, Menu as MenuIcon, User, X } from "lucide-react"
import { useState } from "react"
import { ThemeToggle } from "@/shared/components/theme-toggle"
import { AdminNotificationBell } from "@/shared/components/admin-notification-bell"
import type { PendingCounts } from "@/shared/lib/pending-counts"
import { cn } from "@/shared/lib/utils"
import { SITE } from "@/shared/constants/site"
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/components/ui/sheet"
import { Button } from "@/shared/components/ui/button"

type NavGroup = {
  label: string
  items: { label: string; href: string }[]
}

const ROLE_LABEL: Record<string, string> = { admin: "관리자", staff: "운영진" }

interface AdminHeaderProps {
  siteName: string
  adminName: string
  adminRole: string
  adminAvatarUrl?: string | null
  isTopAdmin: boolean
  logoutAction: () => Promise<void>
  pendingCounts: PendingCounts
}

function buildNavGroups(isTopAdmin: boolean): NavGroup[] {
  return [
    {
      label: "아이들 관리",
      items: [
        { label: "강아지", href: "/admin/dogs" },
        { label: "고양이", href: "/admin/cats" },
      ],
    },
    {
      label: "게시글 관리",
      items: [
        { label: "공지사항", href: "/admin/notices" },
        { label: "지출 내역", href: "/admin/expenses" },
        { label: "왕왕랜드 이야기", href: "/admin/community" },
      ],
    },
    {
      label: "신청 관리",
      items: [
        { label: "봉사 신청", href: "/admin/applications?type=volunteer" },
        { label: "입양 신청", href: "/admin/applications?type=adoption" },
        { label: "후원 내역", href: "/admin/donations" },
      ],
    },
    {
      label: "일정",
      items: [
        { label: "전체 일정", href: "/admin/calendar" },
        { label: "운영진 일정", href: "/admin/schedule" },
      ],
    },
    {
      label: "회원",
      items: [
        { label: "회원", href: "/admin/members" },
        ...(isTopAdmin
          ? [{ label: "운영진", href: "/admin/admins" }]
          : []),
      ],
    },
    { label: "시스템 관리", items: [
      { label: "홈페이지 관리", href: "/admin/settings" },
      { label: "SMS 발송 내역", href: "/admin/sms" },
    ] },
  ]
}

function getAdminMobileBackHref(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean)
  if (segments[0] !== "admin" || segments.length < 3) return null

  // 신청 상세 URL 중간 경로는 실제 페이지가 아니므로 신청 목록으로 이동한다.
  if (segments[1] === "applications") return "/admin/applications"

  // 게시물 관리 수정 화면은 별도 상세 페이지가 없으므로 각 목록으로 이동한다.
  if (
    segments.at(-1) === "edit" &&
    ["dogs", "cats", "notices", "expenses", "daily", "stories", "thanks"].includes(segments[1])
  ) {
    return `/admin/${segments[1]}`
  }

  return `/${segments.slice(0, -1).join("/")}`
}


const menuLinkClass = "relative flex min-h-11 items-center rounded-xl border border-transparent px-3 text-sm text-admin-nav-foreground transition-[color,background-color,border-color,box-shadow] duration-200 hover:border-white/15 hover:bg-white/[0.08] hover:text-white hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-admin-nav motion-reduce:transition-none"
const selectedClass = "border-white/15 bg-white/[0.08] font-semibold text-white before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:rounded-full before:bg-current"

function AdminMenuContent({ adminName, adminRole, adminAvatarUrl, isTopAdmin, logoutAction, pendingCounts, onNavigate }: AdminHeaderProps & { onNavigate?: () => void }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isActive = (href: string) => {
    const [path, query] = href.split("?")
    if (path === "/admin") return pathname === path
    if (path === "/admin/community" && ["/admin/daily", "/admin/stories", "/admin/thanks"].some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))) return true
    if (pathname !== path && !pathname.startsWith(`${path}/`)) return false
    return !query || Array.from(new URLSearchParams(query).entries()).every(([key, value]) => searchParams.get(key) === value)
  }
  const identity = <AdminSidebarProfileIdentity adminName={adminName} adminRole={adminRole} adminAvatarUrl={adminAvatarUrl} />

  return <>
    <div className="admin-sidebar-scroll min-h-0 flex-1 overflow-y-auto p-4">
      <section className={cn("rounded-[22px] border border-white/10 bg-white/[0.06] p-3", pendingCounts.total > 0 && "animate-profile-notification-glow")}>
        {pendingCounts.total > 0 ? (
          <AdminNotificationBell counts={pendingCounts} inline trigger={identity} triggerClassName="min-h-11 p-1 hover:bg-white/[0.08]" surface="admin-dark" />
        ) : <div className="flex min-h-11 items-center p-1">{identity}</div>}
        <Link href="/" target="_blank" rel="noopener noreferrer" onClick={onNavigate} className={cn(menuLinkClass, "mt-3 justify-between text-xs")}>
          메인 페이지
          <ChevronRight className="size-4 shrink-0 text-admin-nav-muted" aria-hidden />
        </Link>
      </section>

      <nav className="mt-8 space-y-8" aria-label="관리자 메뉴" onClick={event => {
        if ((event.target as HTMLElement).closest("a")) onNavigate?.()
      }}>
        <Link href="/admin" aria-current={isActive("/admin") ? "page" : undefined} className={cn(menuLinkClass, isActive("/admin") && selectedClass)}>대시보드</Link>
        {buildNavGroups(isTopAdmin).map(group => (
          <section key={group.label}>
            <h2 className="px-2 text-xs font-bold tracking-wide text-admin-nav-muted">{group.label}</h2>
            <ul className="mt-2 grid gap-1 pl-3">
              {group.items.map(item => <li key={item.href}>
                <Link href={item.href} aria-current={isActive(item.href) ? "page" : undefined} className={cn(menuLinkClass, isActive(item.href) && selectedClass)}>
                  {item.label}
                </Link>
              </li>)}
            </ul>
          </section>
        ))}
      </nav>
    </div>
    <form action={logoutAction} className="shrink-0 px-4 pb-4 pt-2">
      <button type="submit" className={cn(menuLinkClass, "w-full justify-center text-admin-nav-muted")}>로그아웃</button>
    </form>
  </>
}

export function AdminSidebar(props: AdminHeaderProps) {
  return <aside aria-label="관리자 사이드메뉴" className="sticky top-6 z-30 hidden h-[calc(100dvh-7rem)] w-full min-w-0 flex-col overflow-hidden rounded-[26px] border border-admin-nav-border bg-admin-nav shadow-sm md:flex">
    <AdminMenuContent {...props} />
  </aside>
}

function AdminSidebarProfileIdentity({ adminName, adminRole, adminAvatarUrl }: Pick<AdminHeaderProps, "adminName" | "adminRole" | "adminAvatarUrl">) {
  return <span className="flex min-w-0 w-full items-center gap-2">
    <span className="relative size-9 shrink-0 overflow-hidden rounded-full border border-white/20 bg-white/10">
      {adminAvatarUrl ? <Image src={adminAvatarUrl} alt="" fill sizes="36px" className="object-cover" /> : <User className="size-full p-2 text-admin-nav-foreground" aria-hidden />}
    </span>
    <span className="min-w-0 flex-1 text-left">
      <span title={adminName} className="block whitespace-normal break-all text-[13px] font-medium leading-5 text-admin-nav-foreground">{adminName}</span>
      <span className="mt-0.5 block text-xs text-admin-nav-muted">{ROLE_LABEL[adminRole] ?? adminRole}</span>
    </span>
  </span>
}

export function AdminMobileHeader(props: AdminHeaderProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const mobileBackHref = getAdminMobileBackHref(pathname)
  return <header className="border-b border-admin-nav-border bg-admin-nav text-admin-nav-foreground md:hidden">
    <div className="flex h-16 items-center justify-between px-4">
      {mobileBackHref ? <Link href={mobileBackHref} className="inline-flex min-h-11 items-center gap-0.5 text-sm font-medium" aria-label="이전 화면으로"><ChevronLeft className="size-6" aria-hidden /><span>뒤로</span></Link> : (
        <Link href="/admin" className="flex items-center gap-2 whitespace-nowrap text-base font-bold">
          <Image src={SITE.logo} alt="" width={28} height={28} className="size-7 rounded-full" />{props.siteName} 관리자
        </Link>
      )}
      <div className="flex items-center gap-1 [&_button]:text-admin-nav-foreground [&_button:hover]:bg-white/10">
        <ThemeToggle />
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger render={<Button variant="ghost" size="sm" className="size-11 p-0" aria-label="메뉴 열기" />}><MenuIcon className="size-5" aria-hidden /></SheetTrigger>
          <SheetContent side="right" showCloseButton={false} className="flex w-[min(340px,90vw)] flex-col gap-0 bg-admin-nav p-0 text-admin-nav-foreground data-[side=right]:data-starting-style:translate-x-full data-[side=right]:data-ending-style:translate-x-full">
            <SheetHeader className="sr-only"><SheetTitle>{props.siteName} 관리자</SheetTitle></SheetHeader>
            <div className="flex shrink-0 items-center justify-between px-4 py-3.5">
              <span className="text-sm font-semibold">{props.siteName} 관리자</span>
              <SheetClose render={<button type="button" className="flex size-11 items-center justify-center rounded-xl hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70" aria-label="메뉴 닫기" />}><X className="size-4" aria-hidden /></SheetClose>
            </div>
            <AdminMenuContent {...props} onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  </header>
}

export function AdminHeader(props: AdminHeaderProps) {
  return <AdminMobileHeader {...props} />
}
