"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, LogOut, Menu as MenuIcon, Moon, Settings, Sun, User } from "lucide-react"
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
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet"

interface HeaderProps {
  recentNotices?: RecentNoticeMeta[]
  profile?: Profile | null
  pendingCounts?: PendingCounts | null
}

export function Header({ recentNotices = [], profile, pendingCounts }: HeaderProps) {
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
            className="size-12 rounded-full md:size-13"
            priority
          />
          <div className="flex flex-col leading-tight">
            <span className="text-xl font-bold tracking-tight text-foreground">
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
          {profile ? (
            <UserMenu profile={profile} />
          ) : (
            <>
              <ThemeToggle />
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
            <SheetContent side="right" className="w-72 flex flex-col p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>{SITE.name}</SheetTitle>
              </SheetHeader>

              {/* 프로필 섹션 */}
              <MobileProfileSection profile={profile} onClose={() => setMobileOpen(false)} />

              {/* 구분선 */}
              <div className="mx-4 border-t border-border" />

              {/* 네비 메뉴 */}
              <nav className="flex-1 overflow-y-auto py-3">
                <div className="flex flex-col gap-0.5 px-3">
                  {MAIN_NAV.map((item) => {
                    const icon = MOBILE_NAV_ICONS[item.href]
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-base font-medium transition-colors",
                          isActive(item.href)
                            ? "bg-primary/10 text-primary"
                            : "text-foreground/80 hover:bg-secondary"
                        )}
                      >
                        {icon && (
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                            <BrandIcon name={icon} size={22} decorative />
                          </span>
                        )}
                        <span className="flex-1">{item.label}</span>
                        {item.href === "/notice" && (
                          <NoticeBadge notices={recentNotices} />
                        )}
                      </Link>
                    )
                  })}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

const MOBILE_NAV_ICONS: Record<string, BrandIconName> = {
  "/about": "home-shelter",
  "/dogs": "dog",
  "/cats": "paw",
  "/daily": "camera",
  "/stories": "heart",
  "/volunteer": "volunteer",
  "/donate": "gift",
  "/notice": "notification",
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
    // 비로그인
    return (
      <div className="flex flex-col gap-3 px-4 py-5">
        <p className="text-sm text-muted-foreground">로그인하고 더 많은 기능을 이용하세요</p>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            onClick={onClose}
            className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground"
          >
            로그인
          </Link>
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="flex size-10 items-center justify-center rounded-xl border border-border text-foreground/70 hover:bg-secondary"
            aria-label="테마 전환"
          >
            {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-5">
      {/* 아바타 + 닉네임 */}
      <div className="flex items-center gap-3">
        <div className="relative size-12 shrink-0 overflow-hidden rounded-full border-2 border-primary/30 bg-muted">
          {profile.avatar_url ? (
            <Image src={profile.avatar_url} alt={profile.nickname} fill className="object-cover" />
          ) : (
            <User className="size-full p-2.5 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0">
          <RoleBadge role={profile.role} />
          <p className="mt-0.5 truncate font-semibold text-foreground">{profile.nickname}</p>
        </div>
      </div>

      {/* 빠른 액션 버튼들 */}
      <div className="mt-4 flex flex-col gap-1">
        {(profile.role === "staff" || profile.role === "admin") && (
          <Link
            href="/admin"
            onClick={onClose}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10"
          >
            <Settings className="size-4" />
            어드민 페이지
          </Link>
        )}
        <Link
          href="/profile"
          onClick={onClose}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-secondary"
        >
          <User className="size-4" />
          프로필 설정
        </Link>
        <button
          type="button"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-foreground hover:bg-secondary"
        >
          <span className="flex items-center gap-2">
            {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
            {isDark ? "다크 모드" : "라이트 모드"}
          </span>
          <span className="text-xs text-muted-foreground">전환</span>
        </button>
        <button
          type="button"
          onClick={() => { onClose(); signOut() }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
        >
          <LogOut className="size-4" />
          로그아웃
        </button>
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
