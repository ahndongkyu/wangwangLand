"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { ChevronDown, ChevronLeft, ChevronRight, ExternalLink, LogOut, Menu as MenuIcon, Moon, Sun, User, X } from "lucide-react"
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
        { label: "후원 감사글", href: "/admin/thanks" },
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

function getAdminMobileBackHref(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean)
  if (segments[0] !== "admin" || segments.length < 3) return null

  // 신청 상세 URL 중간 경로는 실제 페이지가 아니므로 신청 목록으로 이동한다.
  if (segments[1] === "applications") return "/admin/applications"

  // 게시물 관리 수정 화면은 별도 상세 페이지가 없으므로 각 목록으로 이동한다.
  if (
    segments.at(-1) === "edit" &&
    ["dogs", "cats", "notices", "daily", "stories", "thanks"].includes(segments[1])
  ) {
    return `/admin/${segments[1]}`
  }

  return `/${segments.slice(0, -1).join("/")}`
}

// ────────────────────────────────────────────────────────────
// PC 전용 사이드바 (다크 그린 플랫 메뉴)
// ────────────────────────────────────────────────────────────
export function AdminSidebar({
  siteName,
  adminName,
  adminRole,
  adminAvatarUrl,
  isTopAdmin,
  logoutAction,
  pendingCounts,
}: AdminHeaderProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { resolvedTheme, setTheme } = useTheme()
  const NAV_GROUPS = buildNavGroups(isTopAdmin)
  const isActive = (href: string) => {
    const [path, query] = href.split("?")
    if (!pathname.startsWith(path)) return false
    if (!query) return true
    // 모든 쿼리 파라미터가 현재 URL 과 일치해야 함
    const target = new URLSearchParams(query)
    for (const [k, v] of target.entries()) {
      if (searchParams.get(k) !== v) return false
    }
    return true
  }

  // 활성 그룹은 기본 열림
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      NAV_GROUPS.map((g) => [
        g.label,
        g.items.some((i) => pathname.startsWith(i.href.split("?")[0])),
      ])
    )
  )

  function toggleGroup(label: string) {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[240px] flex-col bg-[#26382F] dark:bg-[#141a17] md:flex">
      {/* 로고 + 알림벨 */}
      <div className="flex items-center justify-between gap-2 px-5 py-5">
        <div className="flex min-w-0 items-center gap-3">
          <Image src={SITE.logo} alt={SITE.name} width={40} height={40} className="size-10 rounded-full" />
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[16px] font-bold text-white">{siteName}</span>
            <span className="text-[10px] font-semibold uppercase tracking-[1px] text-[#91aa9a]">Admin</span>
          </div>
        </div>
        <div className="shrink-0 [&_button]:text-[#d2ded6] [&_button:hover]:bg-white/[0.08]">
          <AdminNotificationBell counts={pendingCounts} align="side" />
        </div>
      </div>

      {/* 네비게이션 (스크롤 가능, 스크롤바 숨김) */}
      <nav className="admin-sidebar-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-2">
        {/* 대시보드 */}
        <div className="mb-1">
          <Link
            href="/admin"
            className={cn(
              "flex items-center rounded-lg px-3 py-2.5 text-[14px] font-medium transition-colors",
              pathname === "/admin"
                ? "bg-[#C96849] font-semibold text-white shadow-sm"
                : "text-[#d8e3dc] hover:bg-white/[0.08]"
            )}
          >
            대시보드
          </Link>
        </div>

        {/* 그룹별 토글 메뉴 */}
        {NAV_GROUPS.map((group) => {
          const isOpen = !!openGroups[group.label]
          return (
            <div key={group.label} className="mt-4">
              {/* 그룹 헤더 (캡션 스타일 — 클릭 시 토글) */}
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                className={cn(
                  "flex w-full items-center justify-between border-b border-white/[0.06] px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[1px] transition-colors",
                  isOpen
                    ? "text-[#a9c0b1] hover:text-[#c7d6cc]"
                    : "text-[#718a79] hover:text-[#9bb2a3]"
                )}
              >
                {group.label}
                <ChevronDown
                  className={cn(
                    "size-3 transition-transform duration-200",
                    isOpen && "rotate-180"
                  )}
                />
              </button>

              {/* 메뉴 아이템 (들여쓰기 + 밝은 색) */}
              {isOpen && (
                <div className="mt-1 ml-2">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center rounded-lg px-3 py-2.5 text-[14.5px] font-medium transition-colors",
                        isActive(item.href)
                          ? "bg-[#C96849] font-semibold text-white shadow-sm"
                          : "text-[#e4ebe5] hover:bg-white/[0.07]"
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* 하단: 프로필 + 액션 버튼 */}
      <div className="border-t border-white/[0.08] px-4 py-4">
        {/* 프로필 */}
        <div className="mb-3 flex items-center gap-3">
          <div className="relative size-9 shrink-0 overflow-hidden rounded-full border border-white/20 bg-white/10">
            {adminAvatarUrl ? (
              <Image src={adminAvatarUrl} alt={adminName} fill className="object-cover" />
            ) : (
              <User className="size-full p-2 text-[#d2ded6]" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <span className="inline-block rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-[#d2ded6]">
              {ROLE_LABEL[adminRole] ?? adminRole}
            </span>
            <p className="truncate text-[13px] font-semibold text-white">{adminName}</p>
          </div>
        </div>

        {/* 액션 버튼 3열 그리드 */}
        <div className="grid grid-cols-3 gap-1">
          <Link
            href="/"
            target="_blank"
            className="flex flex-col items-center gap-1 rounded-lg py-2 text-[10px] text-[#d8e3dc] hover:bg-white/[0.08] transition-colors"
          >
            <ExternalLink className="size-3.5" />
            메인사이트
          </Link>
          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="flex flex-col items-center gap-1 rounded-lg py-2 text-[10px] text-[#d8e3dc] hover:bg-white/[0.08] transition-colors"
          >
            {resolvedTheme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
            테마
          </button>
          <form action={logoutAction} className="contents">
            <button
              type="submit"
              className="flex flex-col items-center gap-1 rounded-lg py-2 text-[10px] text-[#ff9b9b] hover:bg-white/[0.06] transition-colors"
            >
              <LogOut className="size-3.5" />
              로그아웃
            </button>
          </form>
        </div>
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
  const searchParams = useSearchParams()
  const { resolvedTheme, setTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const NAV_GROUPS = buildNavGroups(isTopAdmin)
  const mobileBackHref = getAdminMobileBackHref(pathname)
  const isActive = (href: string) => {
    const [path, query] = href.split("?")
    if (!pathname.startsWith(path)) return false
    if (!query) return true
    const target = new URLSearchParams(query)
    for (const [k, v] of target.entries()) {
      if (searchParams.get(k) !== v) return false
    }
    return true
  }

  return (
    <header className="border-b border-[#3c5145] bg-[#26382f] text-white md:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        {/* 3단계부터 뒤로가기, 그 외에는 로고 */}
        {mobileBackHref ? (
          <Link
            href={mobileBackHref}
            className="inline-flex items-center gap-0.5 text-sm font-medium text-white"
            aria-label="이전 화면으로"
          >
            <ChevronLeft className="size-6" aria-hidden />
            <span>뒤로</span>
          </Link>
        ) : (
          <Link href="/admin" className="flex items-center gap-2 whitespace-nowrap text-base font-bold text-white">
            <Image src={SITE.logo} alt={SITE.name} width={28} height={28} className="size-7 rounded-full" />
            {siteName} 관리자
          </Link>
        )}

        {/* 알림벨 + 햄버거 */}
        <div className="flex items-center gap-1 [&_button]:text-white/80 [&_button:hover]:bg-white/10 [&_button:hover]:text-white">
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
              className="flex w-[min(300px,85vw)] flex-col gap-0 bg-[#1f3028] p-0 text-[#e7ece8] data-[side=right]:data-starting-style:translate-x-full data-[side=right]:data-ending-style:translate-x-full"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>{siteName} 관리자</SheetTitle>
              </SheetHeader>

              {/* 드로어 헤더 */}
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <Image src={SITE.logo} alt={SITE.name} width={28} height={28} className="size-7 rounded-full" />
                  <span className="text-sm font-semibold text-white">
                    {siteName} 관리자
                  </span>
                </div>
                <SheetClose
                  render={
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/75 hover:bg-white/15"
                      aria-label="메뉴 닫기"
                    />
                  }
                >
                  <X className="size-4" />
                </SheetClose>
              </div>

              {/* 관리자 프로필 + 3열 액션 그리드 (상단, 한 세트) */}
              <div className="border-b border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] px-4 py-3.5">
                {/* 프로필 */}
                <div className="mb-3 flex items-center gap-3">
                  <div className="relative size-10 shrink-0 overflow-hidden rounded-full border-2 border-white/20 bg-white/10">
                    {adminAvatarUrl ? (
                      <Image src={adminAvatarUrl} alt={adminName} fill className="object-cover" />
                    ) : (
                      <User className="size-full p-2 text-white/65" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="inline-block rounded-full bg-[#c96849]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#efa085]">
                      {ROLE_LABEL[adminRole] ?? adminRole}
                    </span>
                    <p className="truncate text-sm font-semibold text-white">
                      {adminName}
                    </p>
                  </div>
                </div>

                {/* 액션 버튼 3열 그리드 */}
                <div className="grid grid-cols-3 gap-1">
                  <Link
                    href="/"
                    target="_blank"
                    onClick={() => setMobileOpen(false)}
                    className="flex flex-col items-center gap-1 rounded-lg py-2 text-[10px] font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <ExternalLink className="size-4" />
                    메인사이트
                  </Link>
                  <button
                    type="button"
                    onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                    className="flex flex-col items-center gap-1 rounded-lg py-2 text-[10px] font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
                    테마
                  </button>
                  <form action={logoutAction} className="contents">
                    <button
                      type="submit"
                      onClick={() => setMobileOpen(false)}
                      className="flex flex-col items-center gap-1 rounded-lg py-2 text-[10px] font-medium text-[#ffaaa2] transition-colors hover:bg-white/10"
                    >
                      <LogOut className="size-4" />
                      로그아웃
                    </button>
                  </form>
                </div>
              </div>

              {/* 메뉴 (그룹 모두 펼친 상태, 토글 없음) */}
              <nav className="flex-1 overflow-y-auto py-2">
                <div className="px-4 py-1">
                  <Link
                    href="/admin"
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-1 py-2.5 text-[13px] font-medium transition-colors",
                      pathname === "/admin"
                        ? "bg-white/10 text-[#efa085]"
                        : "text-white/80 hover:bg-white/[0.07] hover:text-white"
                    )}
                  >
                    대시보드
                    <ChevronRight className="size-3.5 text-white/40" />
                  </Link>
                </div>

                {NAV_GROUPS.map((group, gi) => (
                  <div key={group.label}>
                    {gi > 0 && <div className="mx-4 my-1.5 h-px bg-white/10" />}
                    <div className="px-4 py-1">
                      <p className="mb-1 px-1 text-[10px] font-semibold tracking-wider text-[#91aa9a]">
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
                              ? "bg-white/10 font-medium text-[#efa085]"
                              : "text-white/80 hover:bg-white/[0.07] hover:text-white"
                          )}
                        >
                          {item.label}
                          <ChevronRight className="size-3.5 text-white/40" />
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </nav>

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
