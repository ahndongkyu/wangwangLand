"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, ChevronRight, ClipboardList, LogOut, MapPin, Menu as MenuIcon, Moon, Settings, Sun, User, X } from "lucide-react"
import { useTheme } from "@/shared/components/theme-provider"
import { Menu } from "@base-ui/react/menu"
import { useState } from "react"

import { NoticeBadge } from "@/features/notices/components/notice-badge"
import type { RecentNoticeMeta } from "@/features/notices/types"
import { UserMenu } from "@/features/members/components/user-menu"
import { signOut } from "@/features/members/api/actions"
import type { Profile } from "@/features/members/api/queries"
import { RoleBadge } from "@/shared/components/role-badge"
import { AdminNotificationBell } from "@/shared/components/admin-notification-bell"
import type { PendingCounts } from "@/shared/lib/pending-counts"
import { UserNotificationBell } from "@/shared/components/user-notification-bell"
import type { UserNotification } from "@/features/notifications/api/queries"
import {
  BrandIcon,
  type BrandIconName,
} from "@/shared/components/brand-icon"
import { ThemeToggle } from "@/shared/components/theme-toggle"
import {
  HEADER_NAV_GROUPS,
  type HeaderNavItem,
  MAIN_NAV,
  SITE,
} from "@/shared/constants/site"
import { cn } from "@/shared/lib/utils"
import { Button, buttonVariants } from "@/shared/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet"

interface HeaderProps {
  recentNotices?: RecentNoticeMeta[]
  profile?: Profile | null
  pendingCounts?: PendingCounts | null
  userNotifications?: UserNotification[]
  unreadNotificationCount?: number
}

export function Header({ recentNotices = [], profile, pendingCounts, userNotifications = [], unreadNotificationCount = 0 }: HeaderProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href)

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full bg-background",
        "border-b border-border shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 md:grid md:h-20 md:grid-cols-[1fr_auto_1fr] md:gap-4 md:px-6 lg:gap-8">
        <Link href="/" className="flex items-center gap-3 justify-self-start">
          <Image
            src={SITE.logo}
            alt={`${SITE.name} 로고`}
            width={52}
            height={52}
            className="size-10 rounded-full md:size-13"
            priority
          />
          <div className="flex flex-col leading-tight">
            <span className="text-lg font-bold tracking-tight text-foreground md:text-xl">
              {SITE.name}
            </span>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {SITE.subtitle}
            </span>
          </div>
        </Link>

        {/* 데스크톱 중앙 네비 */}
        <nav className="hidden justify-center md:flex">
          <ul className="flex items-center gap-0.5">
            {HEADER_NAV_GROUPS.map((node) =>
              node.kind === "link" ? (
                <li key={node.href}>
                  <Link
                    href={node.href}
                    className={cn(
                      "inline-flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive(node.href)
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/80 hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    {node.label}
                    {node.href === "/notice" && (
                      <NoticeBadge notices={recentNotices} />
                    )}
                  </Link>
                </li>
              ) : (
                <li key={node.label}>
                  <NavGroupDropdown
                    label={node.label}
                    items={node.items}
                    isActive={node.items.some((i) => isActive(i.href))}
                  />
                </li>
              )
            )}
          </ul>
        </nav>

        {/* 오른쪽: 유저/로그인 + 모바일 햄버거 */}
        <div className="flex items-center justify-end gap-2 justify-self-end">
          {pendingCounts && <AdminNotificationBell counts={pendingCounts} />}
          {!pendingCounts && profile && (
            <UserNotificationBell
              notifications={userNotifications}
              unreadCount={unreadNotificationCount}
            />
          )}
          {profile ? (
            <UserMenu profile={profile} />
          ) : (
            <>
              <span className="hidden md:inline-flex">
                <ThemeToggle />
              </span>
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "whitespace-nowrap")}
              >
                로그인
              </Link>
            </>
          )}

          {/* 모바일 햄버거 */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden"
                  aria-label="메뉴 열기"
                />
              }
            >
              <MenuIcon className="size-5" />
            </SheetTrigger>
            <SheetContent
              side="right"
              showCloseButton={false}
              className="w-[min(320px,85vw)] flex flex-col p-0 bg-[#FAF6F0] dark:bg-[#2B2520] gap-0 data-[side=right]:data-starting-style:translate-x-full data-[side=right]:data-ending-style:translate-x-full"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>{SITE.name}</SheetTitle>
              </SheetHeader>

              {/* ── 드로어 헤더 ── */}
              <div className="flex items-center justify-between border-b border-[#E5DDD0] px-4 py-3.5 dark:border-[#3A3229]">
                <div className="flex items-center gap-2">
                  <Image
                    src={SITE.logo}
                    alt={`${SITE.name} 로고`}
                    width={28}
                    height={28}
                    className="size-7 rounded-full"
                  />
                  <span className="text-sm font-semibold text-[#2C2C2A] dark:text-[#F5EDE0]">
                    {SITE.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MobileThemeToggle />
                  <SheetClose
                    render={
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FAF3E8] text-[#6B5D4F] dark:bg-[rgba(255,212,161,0.08)] dark:text-[#B8A78F]"
                        aria-label="메뉴 닫기"
                      />
                    }
                  >
                    <X className="size-4" />
                  </SheetClose>
                </div>
              </div>

              {/* ── 로그인 / 프로필 영역 ── */}
              <MobileProfileSection profile={profile} onClose={() => setMobileOpen(false)} />

              {/* ── 메뉴 그룹 ── */}
              <nav className="flex-1 overflow-y-auto py-2">
                <MobileNavGroup label="아이들 만나기">
                  <MobileNavItem href="/dogs" icon="dog" label="강아지" isActive={isActive("/dogs")} onClose={() => setMobileOpen(false)} />
                  <MobileNavItem href="/cats" icon="paw" label="고양이" isActive={isActive("/cats")} onClose={() => setMobileOpen(false)} />
                  <MobileNavItem href="/stories" icon="heart" label="입양 후기" isActive={isActive("/stories")} onClose={() => setMobileOpen(false)} />
                  <MobileNavItem href="/daily" icon="camera" label="일상" isActive={isActive("/daily")} onClose={() => setMobileOpen(false)} />
                </MobileNavGroup>

                <MobileDivider />

                <MobileNavGroup label="참여하기">
                  <MobileNavItem href="/calendar" icon="calendar" label="일정" isActive={isActive("/calendar")} onClose={() => setMobileOpen(false)} />
                  <MobileNavItem href="/volunteer" icon="volunteer" label="봉사 신청" isActive={isActive("/volunteer")} onClose={() => setMobileOpen(false)} />
                  <MobileNavItem href="/donate" icon="heart" label="후원하기" isActive={isActive("/donate")} onClose={() => setMobileOpen(false)} highlighted />
                </MobileNavGroup>

                <MobileDivider />

                <MobileNavGroup label="정보">
                  <MobileNavItem href="/about" icon="home-shelter" label="센터 소개" isActive={isActive("/about")} onClose={() => setMobileOpen(false)} />
                  <MobileNavItem href="/notice" icon="notification" label="공지사항" isActive={isActive("/notice")} onClose={() => setMobileOpen(false)} noticeBadge={recentNotices} />
                  <MobileNavItem href="/contact" icon={null} label="오시는 길" isActive={isActive("/contact")} onClose={() => setMobileOpen(false)} isLocation />
                </MobileNavGroup>
              </nav>

              {/* ── 하단 SNS ── */}
              {(SITE.sns.naverCafe || SITE.sns.instagram) && (
                <div className="border-t border-[#E5DDD0] bg-[#FAF3E8] px-4 py-3 dark:border-[#3A3229] dark:bg-black/20">
                  <div className="flex gap-2">
                    {SITE.sns.naverCafe && (
                      <a
                        href={SITE.sns.naverCafe}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#E2D6C8] bg-[#F7F2EA] py-2 text-[10px] font-medium text-[#2C2C2A] dark:border-[rgba(255,212,161,0.12)] dark:bg-[rgba(255,212,161,0.06)] dark:text-[#F5EDE0]"
                      >
                        <span className="inline-flex h-[16px] w-[16px] items-center justify-center rounded bg-[#03C75A] text-[9px] font-black text-white">N</span>
                        네이버 카페
                      </a>
                    )}
                    {SITE.sns.instagram && (
                      <a
                        href={SITE.sns.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#E2D6C8] bg-[#F7F2EA] py-2 text-[10px] font-medium text-[#2C2C2A] dark:border-[rgba(255,212,161,0.12)] dark:bg-[rgba(255,212,161,0.06)] dark:text-[#F5EDE0]"
                      >
                        <InstaIcon />
                        인스타
                      </a>
                    )}
                  </div>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

/* ─── 모바일 드로어 헬퍼 컴포넌트 ─── */

function MobileThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FAF3E8] text-[#6B5D4F] dark:bg-[rgba(255,212,161,0.08)] dark:text-[#B8A78F]"
      aria-label="테마 변경"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  )
}

function MobileNavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-1">
      <p className="mb-1 px-1 text-[10px] font-semibold tracking-wider text-[#9B8F80]">{label}</p>
      {children}
    </div>
  )
}

function MobileNavItem({
  href,
  icon,
  label,
  isActive,
  onClose,
  highlighted,
  badge,
  noticeBadge,
  isLocation,
}: {
  href: string
  icon: BrandIconName | null
  label: string
  isActive: boolean
  onClose: () => void
  highlighted?: boolean
  badge?: string
  noticeBadge?: RecentNoticeMeta[]
  isLocation?: boolean
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-1 py-2.5 transition-colors",
        isActive && "bg-primary/8",
        highlighted
          ? "bg-[rgba(232,155,94,0.08)]"
          : !isActive && "hover:bg-[#FAF3E8] dark:hover:bg-[rgba(255,212,161,0.04)]"
      )}
    >
      <span className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center",
        highlighted ? "text-[#C06B2A] dark:text-[#FFD4A1]" : "text-[#C06B2A] dark:text-[#FFD4A1]"
      )}>
        {isLocation
          ? <MapPin className="size-4" />
          : icon && <BrandIcon name={icon} size={16} decorative />
        }
      </span>
      <span className={cn(
        "flex-1 text-[13px]",
        highlighted
          ? "font-medium text-[#C06B2A] dark:text-[#FFD4A1]"
          : isActive
            ? "font-medium text-primary"
            : "text-[#2C2C2A] dark:text-[#F5EDE0]"
      )}>
        {label}
      </span>
      {badge && (
        <span className="rounded-full bg-[#E89B5E] px-1.5 py-0.5 text-[9px] font-semibold text-white dark:text-[#2C2C2A]">
          {badge}
        </span>
      )}
      {noticeBadge && <NoticeBadge notices={noticeBadge} />}
      <ChevronRight className="size-3.5 text-[#9B8F80]" />
    </Link>
  )
}

function MobileDivider() {
  return <div className="mx-4 my-1.5 h-px bg-[#E5DDD0] dark:bg-[#3A3229]" />
}

function InstaIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <defs>
        <linearGradient id="drawer-ig" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F58529" />
          <stop offset="50%" stopColor="#DD2A7B" />
          <stop offset="100%" stopColor="#8134AF" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#drawer-ig)" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="white" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1" fill="white" />
    </svg>
  )
}

function MobileProfileSection({
  profile,
  onClose,
}: {
  profile?: Profile | null
  onClose: () => void
}) {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  if (!profile) {
    return (
      <div className="border-b border-[#E5DDD0] bg-gradient-to-br from-[#FCE9D9] to-[#F5E1C8] px-4 py-3.5 dark:border-[#3A3229] dark:from-[rgba(232,155,94,0.12)] dark:to-[rgba(192,107,42,0.08)]">
        <p className="mb-2 text-[11px] text-[#6B5D4F] dark:text-[#B8A78F]">
          로그인하고 관심 아이를 저장해 보세요
        </p>
        <div className="flex gap-1.5">
          <Link
            href="/login"
            onClick={onClose}
            className="flex-1 rounded-lg bg-[#E89B5E] py-2 text-center text-xs font-semibold text-white dark:text-[#2C2C2A]"
          >
            로그인
          </Link>
          <Link
            href="/signup"
            onClick={onClose}
            className="flex-1 rounded-lg border border-[#E89B5E] bg-[#FDF8F3] py-2 text-center text-xs font-medium text-[#C06B2A] dark:border-[rgba(255,212,161,0.25)] dark:bg-[rgba(255,212,161,0.08)] dark:text-[#FFD4A1]"
          >
            회원가입
          </Link>
        </div>
      </div>
    )
  }

  const isStaff = profile.role === "staff" || profile.role === "admin"

  return (
    <div className="border-b border-[#E5DDD0] bg-gradient-to-br from-[#FAF3E8] to-[#F5EDE0] dark:border-[#3A3229] dark:from-[rgba(232,155,94,0.08)] dark:to-[rgba(192,107,42,0.04)]">
      {/* 프로필 영역 */}
      <Link
        href="/my"
        onClick={onClose}
        className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[rgba(192,107,42,0.06)] dark:hover:bg-[rgba(255,212,161,0.04)]"
      >
        <div className="relative size-10 shrink-0 overflow-hidden rounded-full border-2 border-primary/30 bg-muted">
          {profile.avatar_url ? (
            <Image src={profile.avatar_url} alt={profile.nickname} fill className="object-cover" />
          ) : (
            <User className="size-full p-2 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <RoleBadge role={profile.role} />
          <p className="truncate text-sm font-semibold text-[#2C2C2A] dark:text-[#F5EDE0]">
            {profile.nickname}
          </p>
        </div>
        <span className="text-[11px] font-medium text-[#C06B2A] dark:text-[#FFD4A1]">
          마이페이지 →
        </span>
      </Link>

      {/* 빠른 링크 — divide-x로 border 자동 처리 */}
      <div className="flex divide-x divide-[#E5DDD0] border-t border-[#E5DDD0] dark:divide-[#3A3229] dark:border-[#3A3229]">
        {isStaff && (
          <Link
            href="/admin"
            onClick={onClose}
            className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium text-primary hover:bg-[rgba(192,107,42,0.06)] dark:hover:bg-[rgba(255,212,161,0.04)]"
          >
            <Settings className="size-3.5" />
            어드민
          </Link>
        )}
        <Link
          href="/my/applications"
          onClick={onClose}
          className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium text-[#5F5048] hover:bg-[rgba(192,107,42,0.06)] dark:text-[#B8A78F] dark:hover:bg-[rgba(255,212,161,0.04)]"
        >
          <ClipboardList className="size-3.5" />
          신청 내역
        </Link>
        <form action={signOut} className="flex flex-1">
          <button
            type="submit"
            onClick={onClose}
            className="flex w-full items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium text-destructive hover:bg-destructive/5"
          >
            <LogOut className="size-3.5" />
            로그아웃
          </button>
        </form>
      </div>
    </div>
  )
}

/** 데스크톱 드롭다운 그룹 */
function NavGroupDropdown({
  label,
  items,
  isActive,
}: {
  label: string
  items: ReadonlyArray<HeaderNavItem>
  isActive: boolean
}) {
  return (
    <Menu.Root>
      <Menu.Trigger
        className={cn(
          "group/trig inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          "data-[popup-open]:bg-primary/10 data-[popup-open]:text-primary",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-foreground/80 hover:bg-secondary hover:text-foreground"
        )}
      >
        {label}
        <ChevronDown
          className="size-3.5 opacity-70 transition-transform duration-200 group-data-[popup-open]/trig:rotate-180"
          aria-hidden
        />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={12} align="center">
          <Menu.Popup
            className={cn(
              "relative z-50 w-60 overflow-visible rounded-xl border border-border bg-popover p-1.5",
              "shadow-[0_12px_32px_rgba(0,0,0,0.15)]",
              "data-[starting-style]:-translate-y-1 data-[starting-style]:opacity-0",
              "data-[ending-style]:-translate-y-1 data-[ending-style]:opacity-0",
              "transition-[transform,opacity] duration-200 ease-out"
            )}
          >
            <span
              aria-hidden
              className="absolute -top-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 border-l border-t border-border bg-popover"
            />
            {items.map((item) => (
              <Menu.Item
                key={item.href}
                className={cn(
                  "group/item relative flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm outline-none text-foreground",
                  "transition-all duration-200",
                  "hover:-translate-y-0.5 hover:bg-secondary"
                )}
                render={<Link href={item.href} />}
              >
                {item.icon && (
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary",
                      "transition-colors duration-200",
                      "group-hover/item:bg-primary/30"
                    )}
                  >
                    <BrandIcon
                      name={item.icon as BrandIconName}
                      size={22}
                      decorative
                    />
                  </span>
                )}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-semibold text-foreground">
                    {item.label}
                  </span>
                  {item.desc && (
                    <span className="text-xs leading-snug text-muted-foreground">
                      {item.desc}
                    </span>
                  )}
                </span>
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
