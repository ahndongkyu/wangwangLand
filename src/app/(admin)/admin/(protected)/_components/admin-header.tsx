"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, ExternalLink, LogOut, Moon, Sun, User } from "lucide-react"
import { useState, useEffect, useRef } from "react"

import { useTheme } from "@/shared/components/theme-provider"
import { AdminNotificationBell } from "@/shared/components/admin-notification-bell"
import type { PendingCounts } from "@/shared/lib/pending-counts"
import { cn } from "@/shared/lib/utils"

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
        ...(isTopAdmin ? [{ label: "운영진 관리", href: "/admin/admins" }] : []),
      ],
    },
  ]

  const isActive = (href: string) => pathname.startsWith(href)

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 md:grid md:grid-cols-[1fr_auto_1fr] md:gap-4 md:px-6">
        {/* 왼쪽: 로고 */}
        <Link href="/admin" className="text-base font-bold text-foreground whitespace-nowrap justify-self-start">
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

        {/* 오른쪽: 알림벨 + 유저 드롭다운 */}
        <div className="flex items-center gap-1 justify-self-end">
          <AdminNotificationBell counts={pendingCounts} />
          <AdminUserMenu
            adminName={adminName}
            adminRole={adminRole}
            adminAvatarUrl={adminAvatarUrl}
            logoutAction={logoutAction}
          />
        </div>
      </div>

      {/* 모바일 네비 */}
      <nav className="md:hidden">
        <ul className="flex overflow-x-auto border-t border-border px-2 py-1.5 text-sm gap-1">
          <li className="flex-shrink-0">
            <Link
              href="/admin"
              className={cn(
                "inline-flex items-center rounded-lg px-3 py-2 font-medium transition-colors",
                pathname === "/admin"
                  ? "bg-primary/10 text-primary"
                  : "text-foreground/70 hover:bg-secondary"
              )}
            >
              대시보드
            </Link>
          </li>
          {NAV_GROUPS.flatMap((g) => g.items).map((item) => (
            <li key={item.href} className="flex-shrink-0">
              <Link
                href={item.href}
                className={cn(
                  "inline-flex items-center rounded-lg px-3 py-2 font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/70 hover:bg-secondary"
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
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
          {/* 프로필 헤더 */}
          <div className="border-b border-border px-4 py-3">
            <p className="font-semibold text-foreground">{adminName}</p>
            <span className="mt-0.5 inline-block rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
              {ROLE_LABEL[adminRole] ?? adminRole}
            </span>
          </div>

          <div className="p-1">
            {/* 다크모드 토글 */}
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

            {/* 메인사이트 */}
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

            {/* 로그아웃 */}
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
