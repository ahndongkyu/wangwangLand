"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, MapPin, Menu as MenuIcon, Moon, Settings, Sun, User, X } from "lucide-react"
import { useTheme } from "@/shared/components/theme-provider"
import { Menu } from "@base-ui/react/menu"
import { useState } from "react"

import { NoticeBadge } from "@/features/notices/components/notice-badge"
import type { RecentNoticeMeta } from "@/features/notices/types"
import { UserMenu } from "@/features/members/components/user-menu"
import type { Profile } from "@/features/members/api/queries"
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
  mobileMemberSummary?: {
    nextEvent: {
      href: string
      startsAt: string
      title: string
    } | null
    approvedApplications: number
    pendingApplications: number
  } | null
}

const MOBILE_ROLE_LABEL: Record<Profile["role"], string> = {
  admin: "관리자",
  staff: "운영진",
  full_member: "정회원",
  member: "회원",
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
  pendingCounts,
  userNotifications = [],
  unreadNotificationCount = 0,
  mobileMemberSummary,
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
            "absolute left-1/2 min-w-0 -translate-x-1/2 items-center gap-2 md:gap-3",
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
          {pendingCounts && <AdminNotificationBell counts={pendingCounts} />}
          {!pendingCounts && profile && (
            <UserNotificationBell
              notifications={userNotifications}
              unreadCount={unreadNotificationCount}
            />
          )}
          {profile ? (
            <span className="hidden">
              <UserMenu profile={profile} />
            </span>
          ) : (
            <>
              <span className="hidden">
                <ThemeToggle />
              </span>
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "whitespace-nowrap",
                  "hidden sm:inline-flex lg:hidden"
                )}
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
              className="flex w-[min(320px,85vw)] flex-col gap-0 bg-popover p-0 data-[side=right]:data-starting-style:translate-x-full data-[side=right]:data-ending-style:translate-x-full"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>{SITE.name}</SheetTitle>
              </SheetHeader>

              {/* ── 드로어 회원 헤더 ── */}
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5">
                {profile ? (
                  <Link
                    href="/my"
                    onClick={() => setMobileOpen(false)}
                    className="flex min-w-0 items-center gap-3"
                    aria-label="마이페이지로 이동"
                  >
                    <div className="relative size-11 shrink-0 overflow-hidden rounded-full border-2 border-primary/30 bg-muted">
                      {profile.avatar_url ? (
                        <Image
                          src={profile.avatar_url}
                          alt={profile.nickname}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <User className="size-full p-2 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-col items-start gap-1">
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[9px] font-semibold leading-none",
                          profile.role === "admin"
                            ? "border-red-500/60 text-red-700 dark:text-red-400"
                            : profile.role === "staff"
                              ? "border-amber-500/60 text-amber-700 dark:text-amber-400"
                              : "border-primary/40 text-primary"
                        )}
                      >
                        {MOBILE_ROLE_LABEL[profile.role]}
                      </span>
                      <span className="max-w-[116px] truncate text-sm font-semibold text-foreground">
                        {profile.nickname}님
                      </span>
                    </div>
                  </Link>
                ) : (
                  <span className="text-sm font-semibold text-foreground">
                    메뉴
                  </span>
                )}
                <div className="flex items-center gap-1.5">
                  <MobileThemeToggle />
                  <SheetClose
                    render={
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground"
                        aria-label="메뉴 닫기"
                      />
                    }
                  >
                    <X className="size-4" />
                  </SheetClose>
                </div>
              </div>

              {/* ── 로그인 / 프로필 영역 ── */}
              <MobileProfileSection
                profile={profile}
                summary={mobileMemberSummary}
                onClose={() => setMobileOpen(false)}
              />

              {/* ── 메뉴 그룹 ── */}
              <nav className="flex-1 overflow-y-auto py-2">
                <MobileNavGroup label="아이들 만나기">
                  <MobileNavItem href="/dogs" icon="dog" label="강아지" isActive={isActive("/dogs")} onClose={() => setMobileOpen(false)} />
                  <MobileNavItem href="/cats" icon="paw" label="고양이" isActive={isActive("/cats")} onClose={() => setMobileOpen(false)} />
                  <MobileNavItem href="/stories" icon="heart" label="입양 후기" isActive={isActive("/stories")} onClose={() => setMobileOpen(false)} />
                  <MobileNavItem href="/daily" icon="camera" label="일상" isActive={isActive("/daily")} onClose={() => setMobileOpen(false)} />
                  <MobileNavItem href="/daily?category=자유게시판" icon="chat" label="자유게시판" isActive={false} onClose={() => setMobileOpen(false)} />
                  <MobileNavItem href="/daily?category=질문 및 답변" icon="mail" label="질문 및 답변" isActive={false} onClose={() => setMobileOpen(false)} />
                </MobileNavGroup>

                <MobileDivider />

                <MobileNavGroup label="참여하기">
                  <MobileNavItem href="/calendar" icon="calendar" label="일정" isActive={isActive("/calendar")} onClose={() => setMobileOpen(false)} />
                  <MobileNavItem href="/volunteer" icon="volunteer" label="봉사 신청" isActive={isActive("/volunteer")} onClose={() => setMobileOpen(false)} />
                  <MobileNavItem href="/donate" icon="heart" label="후원하기" isActive={isActive("/donate")} onClose={() => setMobileOpen(false)} highlighted />
                  <MobileNavItem href="/thanks" icon="heart" label="후원 감사글" isActive={isActive("/thanks")} onClose={() => setMobileOpen(false)} />
                </MobileNavGroup>

                <MobileDivider />

                <MobileNavGroup label="정보">
                  <MobileNavItem href="/about" icon="home-shelter" label="센터 소개" isActive={isActive("/about")} onClose={() => setMobileOpen(false)} />
                  <MobileNavItem href="/notice" icon="notification" label="공지사항" isActive={isActive("/notice")} onClose={() => setMobileOpen(false)} noticeBadge={recentNotices} noticeDbLastSeenAt={profile?.notices_last_seen_at} />
                  <MobileNavItem href="/contact" icon={null} label="오시는 길" isActive={isActive("/contact")} onClose={() => setMobileOpen(false)} isLocation />
                </MobileNavGroup>
              </nav>

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

/* ─── 모바일 드로어 헬퍼 컴포넌트 ─── */

function MobileThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground"
      aria-label="테마 변경"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  )
}

function MobileNavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-1">
      <p className="mb-1 px-1 text-[10px] font-semibold tracking-wider text-muted-foreground">{label}</p>
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
  noticeDbLastSeenAt,
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
  noticeDbLastSeenAt?: string | null
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
          ? "bg-primary/10"
          : !isActive && "hover:bg-secondary"
      )}
    >
      <span className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center",
        "text-primary"
      )}>
        {isLocation
          ? <MapPin className="size-4" />
          : icon && <BrandIcon name={icon} size={16} decorative />
        }
      </span>
      <span className={cn(
        "flex-1 text-[13px]",
        highlighted
          ? "font-medium text-primary"
          : isActive
            ? "font-medium text-primary"
            : "text-foreground"
      )}>
        {label}
      </span>
      {badge && (
        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground">
          {badge}
        </span>
      )}
      {noticeBadge && <NoticeBadge notices={noticeBadge} dbLastSeenAt={noticeDbLastSeenAt} />}
      <ChevronRight className="size-3.5 text-muted-foreground" />
    </Link>
  )
}

function MobileDivider() {
  return <div className="mx-4 my-1.5 h-px bg-border" />
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

function MobileProfileSection({
  profile,
  summary,
  onClose,
}: {
  profile?: Profile | null
  summary?: HeaderProps["mobileMemberSummary"]
  onClose: () => void
}) {
  if (!profile) {
    return (
      <div className="border-b border-border bg-gradient-to-br from-primary/15 to-secondary px-4 py-3.5">
        <p className="mb-2 text-[11px] text-muted-foreground">
          로그인하고 관심 아이를 저장해 보세요
        </p>
        <Link
          href="/login"
          onClick={onClose}
          className="block w-full rounded-lg bg-[#FEE500] py-2.5 text-center text-xs font-semibold text-[#3C1E1E]"
        >
          카카오로 로그인 / 시작하기
        </Link>
      </div>
    )
  }

  const isStaff = profile.role === "staff" || profile.role === "admin"

  return (
    <div className="border-b border-border bg-gradient-to-br from-secondary to-muted px-4 py-3">
      {summary && (
        <div className="overflow-hidden rounded-xl border border-border bg-card/80">
          <Link
            href={summary.nextEvent?.href ?? "/calendar"}
            onClick={onClose}
            className="flex min-w-0 items-center gap-2.5 px-3 py-3 transition-colors hover:bg-primary/5"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <CalendarDays className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-medium text-muted-foreground">
                다음 일정
              </span>
              <span className="mt-0.5 block truncate text-[11px] font-semibold text-foreground">
                {summary.nextEvent
                  ? `${formatMobileHeaderDate(summary.nextEvent.startsAt)} · ${summary.nextEvent.title}`
                  : "예정된 일정 없음"}
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </Link>
          <Link
            href="/my/applications"
            onClick={onClose}
            className="flex min-w-0 items-center gap-2.5 border-t border-border px-3 py-3 transition-colors hover:bg-primary/5"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <ClipboardList className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-medium text-muted-foreground">
                신청 현황
              </span>
              <span className="mt-0.5 block truncate text-[11px] font-semibold text-foreground">
                승인 {summary.approvedApplications} · 진행 {summary.pendingApplications}
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        </div>
      )}

      {isStaff && (
        <Link
          href="/admin"
          onClick={onClose}
          className={cn(
            "flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/10",
            summary && "mt-2.5"
          )}
        >
          <span className="flex items-center gap-2">
            <Settings className="size-4" />
            관리자 페이지
          </span>
          <ChevronRight className="size-4" />
        </Link>
      )}
    </div>
  )
}

function formatMobileHeaderDate(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(new Date(iso))
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
