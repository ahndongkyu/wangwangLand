"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, ChevronRight, ExternalLink, LogOut, Menu as MenuIcon, Moon, Sun, User, X } from "lucide-react"
import { useState } from "react"

import { useTheme } from "@/shared/components/theme-provider"
import { AdminNotificationBell } from "@/shared/components/admin-notification-bell"
import type { PendingCounts } from "@/shared/lib/pending-counts"
import { cn } from "@/shared/lib/utils"
import { SITE } from "@/shared/constants/site"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet"
import { Button } from "@/shared/components/ui/button"

type NavGroup = {
  label: string
  items: { label: string; href: string }[]
}

const ROLE_LABEL: Record<string, string> = {
  admin: "관리자",
  staff: "운영진",
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

function buildNavGroups(isTopAdmin: boolean): NavGroup[] {
  return [
    {
      label: "입소 동물",
      items: [
        { label: "강아지", href: "/admin/dogs" },
        { label: "고양이", href: "/admin/cats" },
      ],
    },
    {
      label: "콘텐츠",
      items: [
        { label: "공지사항", href: "/admin/notices" },
        { label: "일상", href: "/admin/daily" },
        { label: "입양후기", href: "/admin/stories" },
        { label: "후원 감사글", href: "/admin/thanks" },
      ],
    },
    {
      label: "신청 관리",
      items: [
        { label: "봉사 신청", href: "/admin/applications/volunteer" },
        { label: "입양 신청", href: "/admin/applications/adoption" },
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
        { label: "일반 회원", href: "/admin/members" },
        ...(isTopAdmin ? [{ label: "운영진", href: "/admin/admins" }] : []),
      ],
    },
    ...(isTopAdmin
      ? [
          {
            label: "시스템",
            items: [{ label: "사이트 설정", href: "/admin/settings" }],
          },
        ]
      : []),
  ]
}

function AdminThemeToggle() {
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

// ────────────────────────────────────────────────────────────
// PC 전용 사이드바
// ────────────────────────────────────────────────────────────
export function AdminSidebar({
  siteName,
  adminName,
  adminRole,
  adminAvatarUrl,
  isTopAdmin,
  logoutAction,
}: Omit<AdminHeaderProps, "pendingCounts">) {
  const pathname = usePathname()
  const NAV_GROUPS = buildNavGroups(isTopAdmin)
  const isActive = (href: string) => pathname.startsWith(href)

  // 활성 그룹은 기본 열림, 나머지는 닫힘
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      NAV_GROUPS.map((g) => [g.label, g.items.some((i) => pathname.startsWith(i.href))])
    )
  )

  function toggleGroup(label: string) {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[240px] flex-col border-r border-[#E5DDD0] bg-[#F5EDE0] dark:border-[#3A3229] dark:bg-[#221E1A] md:flex">
      {/* 로고 */}
      <div className="flex items-center gap-2.5 border-b border-[#E5DDD0] px-5 py-4 dark:border-[#3A3229]">
        <Image src={SITE.logo} alt={SITE.name} width={28} height={28} className="size-7 rounded-full" />
        <span className="text-sm font-semibold text-[#2C2C2A] dark:text-[#F5EDE0]">
          {siteName} 관리자
        </span>
      </div>

      {/* 관리자 프로필 */}
      <div className="border-b border-[#E5DDD0] px-4 py-3 dark:border-[#3A3229]">
        <div className="flex items-center gap-3">
          <div className="relative size-9 shrink-0 overflow-hidden rounded-full border-2 border-primary/30 bg-muted">
            {adminAvatarUrl ? (
              <Image src={adminAvatarUrl} alt={adminName} fill className="object-cover" />
            ) : (
              <User className="size-full p-2 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <span className="inline-block rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
              {ROLE_LABEL[adminRole] ?? adminRole}
            </span>
            <p className="truncate text-sm font-semibold text-[#2C2C2A] dark:text-[#F5EDE0]">
              {adminName}
            </p>
          </div>
        </div>
      </div>

      {/* 네비게이션 (스크롤 가능) */}
      <nav className="flex-1 overflow-y-auto py-2">
        {/* 대시보드 */}
        <div className="px-3 py-1">
          <Link
            href="/admin"
            className={cn(
              "flex items-center rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors",
              pathname === "/admin"
                ? "bg-primary/10 text-primary"
                : "text-[#2C2C2A] hover:bg-[#EDE5D8] dark:text-[#F5EDE0] dark:hover:bg-[rgba(255,212,161,0.07)]"
            )}
          >
            대시보드
          </Link>
        </div>

        {/* 그룹별 드롭다운 메뉴 */}
        {NAV_GROUPS.map((group, gi) => {
          const isOpen = !!openGroups[group.label]
          return (
            <div key={group.label}>
              {gi >= 0 && <div className="mx-3 my-1 h-px bg-[#E5DDD0] dark:bg-[#3A3229]" />}
              <div className="px-3">
                {/* 그룹 헤더 (클릭 시 토글) */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-[11px] font-semibold tracking-wider text-[#9B8F80] hover:bg-[#EDE5D8] dark:hover:bg-[rgba(255,212,161,0.07)] transition-colors"
                >
                  {group.label}
                  <ChevronDown className={cn("size-3.5 transition-transform duration-200", isOpen && "rotate-180")} />
                </button>

                {/* 메뉴 아이템 */}
                {isOpen && (
                  <div className="pb-1 pt-0.5">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center rounded-lg px-3 py-2 text-[13px] transition-colors",
                          isActive(item.href)
                            ? "bg-primary/10 font-medium text-primary"
                            : "text-[#2C2C2A] hover:bg-[#EDE5D8] dark:text-[#F5EDE0] dark:hover:bg-[rgba(255,212,161,0.07)]"
                        )}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </nav>

      {/* 하단: 테마 토글 + 메인사이트 + 로그아웃 */}
      <div className="border-t border-[#E5DDD0] px-3 py-3 dark:border-[#3A3229]">
        <div className="flex items-center justify-between px-2 pb-2">
          <span className="text-[11px] text-[#9B8F80]">테마</span>
          <AdminThemeToggle />
        </div>
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-2 rounded-lg px-2 py-2 text-[11px] font-medium text-[#5F5048] hover:bg-[#EDE5D8] dark:text-[#B8A78F] dark:hover:bg-[rgba(255,212,161,0.07)]"
        >
          <ExternalLink className="size-3.5" />
          메인사이트
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-[11px] font-medium text-destructive hover:bg-destructive/10"
          >
            <LogOut className="size-3.5" />
            로그아웃
          </button>
        </form>
      </div>
    </aside>
  )
}

// ────────────────────────────────────────────────────────────
// 모바일 전용 상단 헤더
// ────────────────────────────────────────────────────────────
export function AdminMobileHeader({
  siteName,
  adminName,
  adminRole,
  adminAvatarUrl,
  isTopAdmin,
  logoutAction,
  pendingCounts,
}: AdminHeaderProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const NAV_GROUPS = buildNavGroups(isTopAdmin)
  const isActive = (href: string) => pathname.startsWith(href)

  return (
    <header className="border-b border-border bg-card md:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        {/* 로고 */}
        <Link href="/admin" className="flex items-center gap-2 text-base font-bold text-foreground whitespace-nowrap">
          <Image src={SITE.logo} alt={SITE.name} width={28} height={28} className="size-7 rounded-full" />
          {siteName} 관리자
        </Link>

        {/* 알림벨 + 햄버거 */}
        <div className="flex items-center gap-1">
          <AdminNotificationBell counts={pendingCounts} />

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="sm" aria-label="메뉴 열기" />
              }
            >
              <MenuIcon className="size-5" />
            </SheetTrigger>

            <SheetContent
              side="right"
              showCloseButton={false}
              className="w-[min(300px,85vw)] flex flex-col p-0 bg-[#FAF6F0] dark:bg-[#2B2520] gap-0 data-[side=right]:data-starting-style:translate-x-full data-[side=right]:data-ending-style:translate-x-full"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>{siteName} 관리자</SheetTitle>
              </SheetHeader>

              {/* 드로어 헤더 */}
              <div className="flex items-center justify-between border-b border-[#E5DDD0] px-4 py-3.5 dark:border-[#3A3229]">
                <div className="flex items-center gap-2">
                  <Image src={SITE.logo} alt={SITE.name} width={28} height={28} className="size-7 rounded-full" />
                  <span className="text-sm font-semibold text-[#2C2C2A] dark:text-[#F5EDE0]">
                    {siteName} 관리자
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <AdminThemeToggle />
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

              {/* 관리자 프로필 */}
              <div className="border-b border-[#E5DDD0] bg-gradient-to-br from-[#FAF3E8] to-[#F5EDE0] px-4 py-3.5 dark:border-[#3A3229] dark:from-[rgba(232,155,94,0.08)] dark:to-[rgba(192,107,42,0.04)]">
                <div className="flex items-center gap-3">
                  <div className="relative size-10 shrink-0 overflow-hidden rounded-full border-2 border-primary/30 bg-muted">
                    {adminAvatarUrl ? (
                      <Image src={adminAvatarUrl} alt={adminName} fill className="object-cover" />
                    ) : (
                      <User className="size-full p-2 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="inline-block rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                      {ROLE_LABEL[adminRole] ?? adminRole}
                    </span>
                    <p className="truncate text-sm font-semibold text-[#2C2C2A] dark:text-[#F5EDE0]">
                      {adminName}
                    </p>
                  </div>
                </div>
              </div>

              {/* 대시보드 */}
              <nav className="flex-1 overflow-y-auto py-2">
                <div className="px-4 py-1">
                  <Link
                    href="/admin"
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-1 py-2.5 text-[13px] font-medium transition-colors",
                      pathname === "/admin"
                        ? "text-primary"
                        : "text-[#2C2C2A] hover:bg-[#FAF3E8] dark:text-[#F5EDE0] dark:hover:bg-[rgba(255,212,161,0.04)]"
                    )}
                  >
                    대시보드
                    <ChevronRight className="size-3.5 text-[#9B8F80]" />
                  </Link>
                </div>

                {NAV_GROUPS.map((group, gi) => (
                  <div key={group.label}>
                    {gi > 0 && <div className="mx-4 my-1.5 h-px bg-[#E5DDD0] dark:bg-[#3A3229]" />}
                    <div className="px-4 py-1">
                      <p className="mb-1 px-1 text-[10px] font-semibold tracking-wider text-[#9B8F80]">
                        {group.label}
                      </p>
                      {group.items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "flex items-center justify-between rounded-lg px-1 py-2.5 text-[13px] transition-colors",
                            isActive(item.href)
                              ? "font-medium text-primary"
                              : "text-[#2C2C2A] hover:bg-[#FAF3E8] dark:text-[#F5EDE0] dark:hover:bg-[rgba(255,212,161,0.04)]"
                          )}
                        >
                          {item.label}
                          <ChevronRight className="size-3.5 text-[#9B8F80]" />
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </nav>

              {/* 하단: 메인사이트 + 로그아웃 */}
              <div className="border-t border-[#E5DDD0] bg-[#FAF3E8] px-4 py-3 dark:border-[#3A3229] dark:bg-black/20">
                <Link
                  href="/"
                  target="_blank"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-2 py-2 text-[11px] font-medium text-[#5F5048] hover:bg-[#F0E8DC] dark:text-[#B8A78F] dark:hover:bg-[rgba(255,212,161,0.04)]"
                >
                  <ExternalLink className="size-3.5" />
                  메인사이트
                </Link>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    onClick={() => setMobileOpen(false)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-[11px] font-medium text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="size-3.5" />
                    로그아웃
                  </button>
                </form>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

// ────────────────────────────────────────────────────────────
// 하위 호환 export (기존 import 유지용)
// ────────────────────────────────────────────────────────────
export function AdminHeader(props: AdminHeaderProps) {
  return (
    <>
      <AdminMobileHeader {...props} />
    </>
  )
}
