"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, ChevronLeft, Menu as MenuIcon, X } from "lucide-react"
import { Menu } from "@base-ui/react/menu"
import { useState } from "react"

import { NoticeBadge } from "@/features/notices/components/notice-badge"
import type { RecentNoticeMeta } from "@/features/notices/types"
import type { Profile } from "@/features/members/api/queries"
import {
  BrandIcon,
  type BrandIconName,
} from "@/shared/components/brand-icon"
import {
  HEADER_NAV_GROUPS,
  type HeaderNavItem,
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
  recentNotices = [],
  profile,
  mobileSidebar,
}: HeaderProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const mobileBackHref = getMobileBackHref(pathname)
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href)

  return (
    <header
      className="sticky top-0 z-40 w-full border-b border-border bg-[linear-gradient(100deg,var(--background)_0%,var(--secondary)_50%,var(--background)_100%)] shadow-[0_2px_8px_rgba(0,0,0,0.06)] backdrop-blur"
    >
      <div
        className="relative mx-auto flex h-14 w-full max-w-[1440px] items-center justify-between px-4 md:h-16 md:px-8 2xl:px-12"
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
          <Image
            src={SITE.logo}
            alt={`${SITE.name} 로고`}
            width={52}
            height={52}
            className={cn(
              "shrink-0 rounded-full",
              "size-9 md:size-10"
            )}
            priority
          />
          <div className="flex min-w-0 flex-col leading-tight">
            <span
              className={cn(
                "truncate text-sm font-bold tracking-tight text-foreground md:text-lg"
              )}
            >
              {SITE.name}
            </span>
            <span
              className="hidden"
            >
              {SITE.subtitle}
            </span>
          </div>
        </Link>

        {/* 데스크톱 중앙 네비 */}
        <nav className="hidden">
          <ul className="flex items-center gap-0.5">
            {HEADER_NAV_GROUPS.map((node) =>
              node.kind === "link" ? (
                <li key={node.href}>
                  <Link
                    href={node.href}
                    className={cn(
                      "group/navlink relative inline-flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive(node.href)
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/80 hover:text-[#2A3D2F] dark:hover:text-[#9ab09e]"
                    )}
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-x-3 bottom-1 h-px origin-left scale-x-0 bg-[#2A3D2F] transition-transform duration-200 group-hover/navlink:scale-x-100 dark:bg-[#9ab09e]"
                    />
                    {node.label}
                    {node.href === "/notice" && (
                      <NoticeBadge notices={recentNotices} dbLastSeenAt={profile?.notices_last_seen_at} />
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

        <div className="ml-auto hidden items-center gap-1.5 lg:flex">
          {SITE.sns.kakaoChannel && (
            <HeaderChannelLink
              href={SITE.sns.kakaoChannel}
              label="카카오톡 문의"
              className="border-[#F0D900] bg-[#FEE500] text-[#3C1E1E] hover:bg-[#FFEA32]"
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
        </div>

        {/* 오른쪽: 유저/로그인 + 모바일 햄버거 */}
        <div
          className="ml-auto flex min-w-0 items-center justify-end gap-1.5 lg:hidden"
        >
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
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="default"
                  size="sm"
                  className="size-9 rounded-lg p-0 shadow-sm lg:hidden"
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
                  <Image
                    src={SITE.logo}
                    alt={`${SITE.name} 로고`}
                    width={32}
                    height={32}
                    className="size-8 rounded-full"
                  />
                  <span className="text-sm font-bold text-foreground">{SITE.name}</span>
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
  className,
  children,
}: {
  href: string
  label: string
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
        "flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary hover:shadow-md",
        className
      )}
    >
      {children}
    </a>
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
