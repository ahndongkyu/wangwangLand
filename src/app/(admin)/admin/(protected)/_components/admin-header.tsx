"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown } from "lucide-react"
import { useState, useEffect, useRef } from "react"

import { ThemeToggle } from "@/shared/components/theme-toggle"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

type NavGroup = {
  label: string
  items: { label: string; href: string }[]
}

const ROLE_LABEL: Record<string, string> = {
  admin: "최고관리자",
  editor: "관리자",
}

interface AdminHeaderProps {
  siteName: string
  adminName: string
  adminRole: string
  isTopAdmin: boolean
  logoutAction: () => Promise<void>
}

export function AdminHeader({
  siteName,
  adminName,
  adminRole,
  isTopAdmin,
  logoutAction,
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

        {/* 오른쪽: 유저 정보 + 로그아웃 */}
        <div className="flex items-center gap-3 justify-self-end">
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {adminName}{" "}
            <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              {ROLE_LABEL[adminRole] ?? adminRole}
            </span>
          </span>
          <ThemeToggle />
          <form action={logoutAction}>
            <Button type="submit" variant="outline" size="sm">
              로그아웃
            </Button>
          </form>
        </div>
      </div>

      {/* 모바일 네비 */}
      <nav className="md:hidden">
        <ul className="flex overflow-x-auto border-t border-border px-2 py-2 text-sm">
          <li className="flex-shrink-0">
            <Link
              href="/admin"
              className={cn(
                "rounded-md px-3 py-1.5 font-medium",
                pathname === "/admin" ? "text-primary" : "text-foreground/70"
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
                  "rounded-md px-3 py-1.5 font-medium",
                  isActive(item.href) ? "text-primary" : "text-foreground/70"
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
