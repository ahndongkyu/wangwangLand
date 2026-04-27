"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, ChevronRight, ExternalLink, LogOut, Menu as MenuIcon, Moon, Sun, User, X } from "lucide-react"
import { useState, useEffect, useRef } from "react"

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

export function AdminHeader({
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

  const NAV_GROUPS: NavGroup[] = [
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
        { label: "일상", href: "/admin/daily" },
        { label: "입양후기", href: "/admin/stories" },
      ],
    },
    {
      label: "회원 관리",
      items: [
        { label: "회원 관리", href: "/admin/members" },
        { label: "신청 관리", href: "/admin/applications" },
        { label: "후원 관리", href: "/admin/donations" },
        ...(isTopAdmin ? [{ label: "운영진 관리", href: "/admin/admins" }] : []),
      ],
    },
  ]

  const isActive = (href: string) => pathname.startsWith(href)

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 md:grid md:grid-cols-[1fr_auto_1fr] md:gap-4 md:px-6">
        {/* 왼쪽: 로고 */}
        <Link href="/admin" className="flex items-center gap-2 text-base font-bold text-foreground whitespace-nowrap justify-self-start">
          <Image src={SITE.logo} alt={SITE.name} width={28} height={28} className="size-7 rounded-full" />
          {siteName} 관리자
        </Link>

        {/* 가운데: 데스크톱 네비 */}
        <nav className="hidden md:flex justify-center">
          <ul className="flex items-center gap-1 text-sm">
            <li>
              <Link
                href="/admin"
                className={cn(
                  "rounded-md px-3 py-1.5 font-medium transition-colors",
                  pathname === "/admin"
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/70 hover:bg-secondary hover:text-foreground"
                )}
              >
                대시보드
              </Link>
            </li>
            {NAV_GROUPS.map((group) => (
              <li key={group.label}>
                <NavDropdown
                  group={group}
                  isActive={group.items.some((i) => isActive(i.href))}
                />
              </li>
            ))}
          </ul>
        </nav>

        {/* 오른쪽: 알림벨 + 유저 드롭다운 + 모바일 햄버거 */}
        <div className="flex items-center gap-1 justify-self-end">
          <AdminNotificationBell counts={pendingCounts} />
          <AdminUserMenu
            adminName={adminName}
            adminRole={adminRole}
            adminAvatarUrl={adminAvatarUrl}
            logoutAction={logoutAction}
          />

          {/* 모바일 햄버거 */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="sm" className="md:hidden" aria-label="메뉴 열기" />
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

function AdminUserMenu({
  adminName,
  adminRole,
  adminAvatarUrl,
  logoutAction,
}: {
  adminName: string
  adminRole: string
  adminAvatarUrl?: string | null
  logoutAction: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full px-1 py-1 transition-opacity hover:opacity-80 outline-none"
        aria-label="계정 메뉴"
      >
        <div className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-primary/30 bg-primary/10">
          {adminAvatarUrl ? (
            <Image src={adminAvatarUrl} alt={adminName} fill className="object-cover" />
          ) : (
            <User className="size-4 text-primary" />
          )}
        </div>
        <span className="hidden max-w-[80px] truncate text-sm font-medium text-foreground sm:block">
          {adminName}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-52 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
          <div className="border-b border-border px-4 py-3">
            <p className="font-semibold text-foreground">{adminName}</p>
            <span className="mt-0.5 inline-block rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
              {ROLE_LABEL[adminRole] ?? adminRole}
            </span>
          </div>

          <div className="p-1">
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

            <Link
              href="/"
              target="_blank"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-secondary"
            >
              <ExternalLink className="size-4" />
              메인사이트
            </Link>

            <div className="mx-2 my-1 border-t border-border" />

            <form action={logoutAction}>
              <button
                type="submit"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
              >
                <LogOut className="size-4" />
                로그아웃
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function NavDropdown({ group, isActive }: { group: NavGroup; isActive: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-foreground/70 hover:bg-secondary hover:text-foreground"
        )}
      >
        {group.label}
        <ChevronDown
          className={cn("size-3.5 opacity-70 transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-9 z-50 min-w-[140px] overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
          {group.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm text-foreground hover:bg-secondary"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
