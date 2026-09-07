"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import {
  BadgeDollarSign,
  CalendarDays,
  Camera,
  Cat,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Dog,
  ExternalLink,
  Gift,
  HandHeart,
  Heart,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu as MenuIcon,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  User,
  Users,
  X,
  type LucideIcon,
} from "lucide-react"
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
  items: { label: string; href: string; icon: LucideIcon }[]
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
        { label: "강아지", href: "/admin/dogs", icon: Dog },
        { label: "고양이", href: "/admin/cats", icon: Cat },
      ],
    },
    {
      label: "게시글 관리",
      items: [
        { label: "공지사항", href: "/admin/notices", icon: Megaphone },
        { label: "일상", href: "/admin/daily", icon: Camera },
        { label: "입양후기", href: "/admin/stories", icon: Heart },
        { label: "후원 감사글", href: "/admin/thanks", icon: Gift },
      ],
    },
    {
      label: "신청 관리",
      items: [
        { label: "봉사 신청", href: "/admin/applications?type=volunteer", icon: HandHeart },
        { label: "입양 신청", href: "/admin/applications?type=adoption", icon: ClipboardCheck },
        { label: "후원 내역", href: "/admin/donations", icon: BadgeDollarSign },
      ],
    },
    {
      label: "일정",
      items: [
        { label: "전체 일정", href: "/admin/calendar", icon: CalendarDays },
        { label: "운영진 일정", href: "/admin/schedule", icon: Clock3 },
      ],
    },
    {
      label: "회원",
      items: [
        { label: "일반 회원", href: "/admin/members", icon: Users },
        ...(isTopAdmin
          ? [{ label: "운영진", href: "/admin/admins", icon: ShieldCheck }]
          : []),
      ],
    },
    ...(isTopAdmin
      ? [
          {
            label: "시스템",
            items: [{ label: "사이트 설정", href: "/admin/settings", icon: Settings }],
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
// PC 전용 사이드바
// ────────────────────────────────────────────────────────────
export function AdminSidebar({
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

  return (
    <aside className="fixed bottom-5 left-5 top-5 z-30 hidden w-[252px] flex-col overflow-hidden rounded-[26px] border border-[#40584b] bg-[#26382f] p-4 shadow-[0_18px_42px_rgba(20,34,27,0.24)] md:flex dark:border-[#34433a] dark:bg-[#1d2722]">
      <div
        className={cn(
          "rounded-[20px] border border-white/10 bg-white/[0.06] p-3 shadow-[0_10px_26px_rgba(8,18,12,0.16)]",
          pendingCounts.total > 0 &&
            "animate-profile-notification-glow border-[#e89273]/80"
        )}
      >
        {pendingCounts.total > 0 ? (
          <AdminNotificationBell
            counts={pendingCounts}
            inline
            trigger={
              <AdminSidebarProfileIdentity
                adminName={adminName}
                adminRole={adminRole}
                adminAvatarUrl={adminAvatarUrl}
              />
            }
            triggerClassName="p-1 hover:bg-white/[0.08]"
          />
        ) : (
          <AdminSidebarProfileIdentity
            adminName={adminName}
            adminRole={adminRole}
            adminAvatarUrl={adminAvatarUrl}
          />
        )}
        <Link
          href="/"
          target="_blank"
          className="mt-3 flex min-h-10 items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-[#e4ebe5] transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.08]"
        >
          <span className="flex items-center gap-2">
            <ExternalLink className="size-4 text-[#efa085]" aria-hidden />
            메인 페이지
          </span>
          <ChevronRight className="size-4 text-[#9db1a4]" aria-hidden />
        </Link>
      </div>

      <nav className="admin-sidebar-scroll mt-5 min-h-0 flex-1 overflow-y-auto" aria-label="관리자 메뉴">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/admin"
            className={cn(
              "group flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5",
              pathname === "/admin"
                ? "bg-[#c96849] font-semibold text-white shadow-[0_7px_16px_rgba(10,24,16,0.20)]"
                : "text-[#e4ebe5] hover:bg-white/[0.08] hover:text-white"
            )}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.08] transition-transform duration-200 group-hover:scale-105">
              <LayoutDashboard className="size-4" aria-hidden />
            </span>
            대시보드
          </Link>
        </div>

        {NAV_GROUPS.map((group) => (
          <section key={group.label} className="mt-5">
            <h2 className="px-2 text-[11px] font-semibold tracking-wide text-[#9db1a4]">
              {group.label}
            </h2>
            <div className="mt-2 grid gap-1">
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm transition-all duration-200 hover:-translate-y-0.5",
                      isActive(item.href)
                        ? "bg-[#c96849] font-semibold text-white shadow-[0_7px_16px_rgba(10,24,16,0.20)]"
                        : "text-[#e4ebe5] hover:bg-white/[0.08] hover:text-white"
                    )}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.07] text-[#b8cbbf] transition-all duration-200 group-hover:scale-105 group-hover:text-white">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </section>
        ))}
      </nav>

      <div className="mt-4 grid grid-cols-2 gap-1 rounded-[20px] border border-white/10 bg-white/[0.05] p-2">
          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] text-[#d8e3dc] transition-colors hover:bg-white/[0.08]"
          >
            {resolvedTheme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
            테마
          </button>
          <form action={logoutAction} className="contents">
            <button
              type="submit"
              className="flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] text-[#ffaaa2] transition-colors hover:bg-white/[0.08]"
            >
              <LogOut className="size-3.5" />
              로그아웃
            </button>
          </form>
      </div>
    </aside>
  )
}

function AdminSidebarProfileIdentity({
  adminName,
  adminRole,
  adminAvatarUrl,
}: Pick<AdminHeaderProps, "adminName" | "adminRole" | "adminAvatarUrl">) {
  return (
    <span className="flex w-full min-w-0 items-center gap-3">
      <span className="relative size-12 shrink-0 overflow-hidden rounded-full border-2 border-white/20 bg-white/10">
        {adminAvatarUrl ? (
          <Image
            src={adminAvatarUrl}
            alt={adminName}
            fill
            sizes="48px"
            className="object-cover"
          />
        ) : (
          <User className="size-full p-2.5 text-[#d2ded6]" aria-hidden />
        )}
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block break-all text-sm font-semibold leading-snug text-white">
          {adminName}님
        </span>
        <span className="mt-1 block text-xs text-[#a9c0b1]">
          {ROLE_LABEL[adminRole] ?? adminRole}
        </span>
      </span>
    </span>
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
