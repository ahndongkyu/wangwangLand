"use client"

import { HeaderLogo } from "@/shared/components/header-logo"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronLeft, Menu as MenuIcon, X } from "lucide-react"
import { useState } from "react"

import type { RecentNoticeMeta } from "@/features/notices/types"
import type { Profile } from "@/features/members/api/queries"
import {
  SITE,
} from "@/shared/constants/site"
import { cn } from "@/shared/lib/utils"
import { Button, buttonVariants } from "@/shared/components/ui/button"
import { ThemeToggle } from "@/shared/components/theme-toggle"
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
  mobileSidebar?: React.ReactNode
}

function getMobileBackHref(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean)
  if (segments.length < 2) return null

  // 상세 경로가 별도 페이지로 존재하지 않는 신청 수정 화면은 신청 목록으로 이동한다.
  if (
    segments[0] === "my" &&
    segments[1] === "applications" &&
    segments[2] === "volunteer"
  ) {
    return "/my/applications"
  }

  return `/${segments.slice(0, -1).join("/")}`
}

export function Header({
  profile,
  mobileSidebar,
}: HeaderProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const mobileBackHref = getMobileBackHref(pathname)
  const canManage = profile?.role === "admin" || profile?.role === "staff"

  return (
    <header
      className="sticky top-0 z-40 w-full border-b border-border bg-card/95 backdrop-blur dark:bg-sidebar/95"
    >
      <div
        className="relative mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-4 lg:h-24 md:px-8 2xl:px-12"
      >
        {mobileBackHref && (
          <Link
            href={mobileBackHref}
            className="inline-flex items-center gap-0.5 text-sm font-medium text-foreground lg:hidden"
            aria-label="이전 화면으로"
          >
            <ChevronLeft className="size-6" aria-hidden />
            <span>뒤로</span>
          </Link>
        )}
        <Link
          href="/"
          className={cn(
            "min-w-0 items-center gap-2 md:gap-3 lg:absolute lg:left-1/2 lg:-translate-x-1/2",
            mobileBackHref ? "hidden lg:flex" : "flex"
          )}
        >
          <HeaderLogo
            className={cn("lg:w-[260px]", canManage ? "w-[132px] sm:w-[180px]" : "w-[180px]")}
          />
        </Link>

        <div className="ml-auto hidden items-center gap-1 xl:flex">
          {canManage && (
            <Link href="/admin" aria-label="관리자 페이지" className="inline-flex min-h-11 items-center whitespace-nowrap rounded-lg px-2 text-xs font-semibold text-primary transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className="min-[1440px]:hidden">관리자</span>
              <span className="hidden min-[1440px]:inline">관리자 페이지</span>
              <span className="ml-1" aria-hidden>↗</span>
            </Link>
          )}
          {SITE.sns.kakaoChannel && (
            <HeaderChannelLink
              href={SITE.sns.kakaoChannel}
              label="카카오톡 문의"
              compactLabel="카카오톡"
            >
              <KakaoIcon />
            </HeaderChannelLink>
          )}
          {SITE.sns.naverCafe && (
            <HeaderChannelLink href={SITE.sns.naverCafe} label="네이버 카페">
              <span className="inline-flex size-4 items-center justify-center rounded bg-[#03C75A] text-[10px] font-black text-white">
                N
              </span>
            </HeaderChannelLink>
          )}
          {SITE.sns.instagram && (
            <HeaderChannelLink href={SITE.sns.instagram} label="인스타그램">
              <InstaIcon />
            </HeaderChannelLink>
          )}
          <ThemeToggle />
        </div>

        {/* 오른쪽: 유저/로그인 + 모바일 햄버거 */}
        <div
          className="ml-auto flex min-w-0 items-center justify-end gap-1 xl:hidden"
        >
          {canManage && <Link href="/admin" aria-label="관리자 페이지" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-xs font-semibold text-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">관리자</Link>}
          {!profile && (
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "hidden whitespace-nowrap sm:inline-flex lg:hidden"
              )}
            >
              로그인
            </Link>
          )}

          {/* 모바일 햄버거 */}
          <ThemeToggle />
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="size-11 rounded-lg p-0 shadow-none xl:hidden"
                  aria-label="메뉴 열기"
                />
              }
            >
              <MenuIcon className="size-5" />
            </SheetTrigger>
            <SheetContent
              side="right"
              showCloseButton={false}
              className="flex w-[min(340px,90vw)] flex-col gap-0 bg-sidebar p-0 data-[side=right]:data-starting-style:translate-x-full data-[side=right]:data-ending-style:translate-x-full"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>{SITE.name}</SheetTitle>
              </SheetHeader>

              {/* 드로어 브랜드 헤더 */}
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5">
                <Link
                  href="/"
                  onClick={() => setMobileOpen(false)}
                  className="flex min-w-0 items-center gap-2.5"
                >
                  <HeaderLogo className="w-[180px]" />
                </Link>
                <SheetClose
                  render={
                    <button
                      type="button"
                      className="flex size-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-colors hover:text-foreground"
                      aria-label="메뉴 닫기"
                    />
                  }
                >
                  <X className="size-4" />
                </SheetClose>
              </div>

              <div
                className="admin-sidebar-scroll min-h-0 flex-1 overflow-y-auto"
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest("a")) {
                    setMobileOpen(false)
                  }
                }}
              >
                {mobileSidebar}
              </div>

              {/* ── 하단 SNS ── */}
              {(SITE.sns.kakaoChannel || SITE.sns.naverCafe || SITE.sns.instagram) && (
                <div className="border-t border-border bg-secondary/60 px-4 py-3">
                  <div className="grid grid-cols-3 gap-2">
                    {SITE.sns.kakaoChannel && (
                      <a
                        href={SITE.sns.kakaoChannel}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-[#F0D900] bg-[#FEE500] py-2 text-[10px] font-medium text-[#3C1E1E]"
                      >
                        <KakaoIcon />
                        카카오톡
                      </a>
                    )}
                    {SITE.sns.naverCafe && (
                      <a
                        href={SITE.sns.naverCafe}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card py-2 text-[10px] font-medium text-foreground"
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
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card py-2 text-[10px] font-medium text-foreground"
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

function KakaoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3C6.48 3 2 6.45 2 10.7c0 2.75 1.88 5.16 4.7 6.52l-1.2 3.53a.45.45 0 0 0 .68.51l4.15-2.74c.54.08 1.1.12 1.67.12 5.52 0 10-3.45 10-7.94S17.52 3 12 3Z"
        fill="currentColor"
      />
    </svg>
  )
}

function HeaderChannelLink({
  href,
  label,
  compactLabel,
  className,
}: {
  href: string
  label: string
  compactLabel?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-1 whitespace-nowrap rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      {compactLabel ? (
        <>
          <span className="min-[1440px]:hidden">{compactLabel}</span>
          <span className="hidden min-[1440px]:inline">{label}</span>
        </>
      ) : label}
      <span aria-hidden>↗</span>
    </a>
  )
}
