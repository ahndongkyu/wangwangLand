"use client"

import Link from "next/link"
import { useOperatingContact } from "@/features/settings/components/operating-provider"
import type { RecentNoticeMeta } from "@/features/notices/types"
import type { Profile } from "@/features/members/api/queries"
import type { UserNotification } from "@/features/notifications/api/queries"
import type { PendingCounts } from "@/shared/lib/pending-counts"
import { HeaderLogo } from "@/shared/components/header-logo"
import { HeaderProfile } from "@/shared/components/header-profile"
import { MobileHeaderMenu } from "@/shared/components/mobile-header-menu"
import { ThemeToggle } from "@/shared/components/theme-toggle"
import { AdminNotificationBell } from "@/shared/components/admin-notification-bell"
import { UserNotificationBell } from "@/shared/components/user-notification-bell"

interface HeaderProps {
  recentNotices?: RecentNoticeMeta[]
  profile?: Profile | null
  mobileSidebar?: React.ReactNode
  pendingCounts?: PendingCounts | null
  userNotifications?: UserNotification[]
  unreadNotificationCount?: number
}

export function Header({ profile, mobileSidebar, pendingCounts, userNotifications = [], unreadNotificationCount = 0 }: HeaderProps) {
  const contact = useOperatingContact()
  const canManage = profile?.role === "admin" || profile?.role === "staff"
  const account = <HeaderProfile name={profile?.nickname} avatarUrl={profile?.avatar_url} />
  const notification = profile && (pendingCounts
    ? <AdminNotificationBell counts={pendingCounts} />
    : <UserNotificationBell notifications={userNotifications} unreadCount={unreadNotificationCount} />)
  const channels = [
    { label: "카카오톡", href: contact?.kakaoChannel },
    { label: "카페", href: contact?.naverCafe },
    { label: "인스타", href: contact?.instagram },
  ].filter(item => item.href)
  const channelLinks = channels.map(item => <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{item.label}</a>)
  const adminLink = canManage && <Link href="/admin" className="inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-semibold text-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">관리자 사이트</Link>

  return <header className="sticky top-0 z-40 w-full border-b border-border bg-card/95 backdrop-blur">
    <div className="mx-auto grid h-16 max-w-[1440px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-4 md:px-8 lg:h-20 2xl:px-12">
      <nav aria-label="외부 채널 및 관리자" className="hidden items-center gap-3 lg:flex">{channelLinks}{adminLink}</nav>
      <div className="justify-self-start lg:hidden">
        <MobileHeaderMenu title="왕왕랜드 메뉴">
          <div className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card p-3">{account}<ThemeToggle /></div>
          {canManage && <div className="mt-2 px-3">{adminLink}</div>}
          {mobileSidebar}
          <nav aria-label="외부 채널" className="mt-4 flex justify-center gap-4 border-t border-border pt-3">{channelLinks}</nav>
        </MobileHeaderMenu>
      </div>
      <Link href="/" aria-label="왕왕랜드 홈" className="flex min-h-11 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <HeaderLogo className="w-[132px] lg:w-[192px]" />
      </Link>
      <div className="flex min-w-0 items-center justify-self-end gap-2">
        <div className="hidden lg:block"><ThemeToggle /></div>
        {notification}
        <div className="hidden min-w-0 lg:block">{account}</div>
        {!profile && <Link href="/login" className="flex min-h-11 items-center text-xs font-medium lg:hidden">로그인</Link>}
      </div>
    </div>
  </header>
}
