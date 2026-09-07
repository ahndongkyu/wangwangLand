"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { ReactNode } from "react"
import { useState, useTransition } from "react"
import {
  ChevronRight,
  CirclePlus,
  LogOut,
  Moon,
  Settings2,
  Sparkles,
  Sun,
  User,
} from "lucide-react"

import type { Profile } from "@/features/members"
import type { UserNotification } from "@/features/notifications/api/queries"
import { signOut, updateHomeFavorites } from "@/features/members/api/actions"
import { AdminNotificationBell } from "@/shared/components/admin-notification-bell"
import { BrandIcon } from "@/shared/components/brand-icon"
import { useTheme } from "@/shared/components/theme-provider"
import { UserNotificationBell } from "@/shared/components/user-notification-bell"
import {
  HOME_FAVORITE_OPTIONS,
  type HomeFavoriteKey,
} from "@/shared/constants/home-navigation"
import type { PendingCounts } from "@/shared/lib/pending-counts"
import { cn } from "@/shared/lib/utils"

const ROLE_LABEL: Record<Profile["role"], string> = {
  admin: "관리자",
  staff: "운영진",
  full_member: "정회원",
  member: "회원",
}

interface Props {
  profile: Profile | null
  initialFavorites: HomeFavoriteKey[]
  pendingCounts?: PendingCounts | null
  userNotifications?: UserNotification[]
  unreadNotificationCount?: number
  variant?: "desktop" | "mobile"
}

export function HomeSidebar({
  profile,
  initialFavorites,
  pendingCounts,
  userNotifications = [],
  unreadNotificationCount = 0,
  variant = "desktop",
}: Props) {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const [favorites, setFavorites] = useState(initialFavorites)
  const [draft, setDraft] = useState(initialFavorites)
  const [editing, setEditing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const selectedItems = favorites
    .map((key) => HOME_FAVORITE_OPTIONS.find((item) => item.key === key))
    .filter((item): item is (typeof HOME_FAVORITE_OPTIONS)[number] => !!item)
  const hasSidebarNotification = pendingCounts
    ? pendingCounts.total > 0
    : unreadNotificationCount > 0

  function openEditor() {
    setDraft(favorites)
    setMessage(null)
    setEditing(true)
  }

  function toggleDraft(key: HomeFavoriteKey) {
    setDraft((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    )
  }

  function saveFavorites() {
    if (draft.length === 0) {
      setMessage("즐겨찾기를 한 개 이상 선택해주세요.")
      return
    }

    startTransition(async () => {
      const result = await updateHomeFavorites(draft)
      if (result.error) {
        setMessage(result.error)
        return
      }
      setFavorites(result.items ?? draft)
      setEditing(false)
      setMessage(null)
      router.refresh()
    })
  }

  const idPrefix = variant === "mobile" ? "mobile-" : ""
  const toggleTheme = () =>
    setTheme(resolvedTheme === "dark" ? "light" : "dark")

  const favoriteEditor = editing ? (
    <div className="mt-3 rounded-2xl border border-border bg-card p-3 shadow-[0_14px_32px_rgba(88,76,68,0.12)]">
      <p className="mb-2 text-xs font-semibold text-foreground/80">
        즐겨찾기에 표시할 메뉴
      </p>
      <div
        className={cn(
          "grid gap-1",
          variant === "desktop" && "sm:grid-cols-2 lg:grid-cols-1"
        )}
      >
        {HOME_FAVORITE_OPTIONS.map((item) => (
          <label
            key={item.key}
            className="flex min-h-10 cursor-pointer items-center gap-2 rounded-xl px-2 text-sm text-foreground transition-colors hover:bg-primary/5"
          >
            <input
              type="checkbox"
              checked={draft.includes(item.key)}
              onChange={() => toggleDraft(item.key)}
              className="size-4 accent-primary"
            />
            <BrandIcon name={item.icon} size={18} decorative />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
      {message && (
        <p className="mt-2 text-xs text-rose-600" role="alert">
          {message}
        </p>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="min-h-9 rounded-xl border border-border px-3 text-xs font-semibold text-muted-foreground"
        >
          취소
        </button>
        <button
          type="button"
          onClick={saveFavorites}
          disabled={pending}
          className="min-h-9 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-60"
        >
          {pending ? "저장 중" : "저장"}
        </button>
      </div>
    </div>
  ) : null

  const content = (
    <div className="space-y-5">
      <section
        className={cn(
          "rounded-[22px] border border-border bg-card p-4 shadow-[0_10px_30px_rgba(88,76,68,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(88,76,68,0.13)]",
          hasSidebarNotification &&
            "animate-profile-notification-glow border-primary/70"
        )}
      >
        {profile ? (
          <>
            {pendingCounts ? (
              pendingCounts.total > 0 ? (
                <AdminNotificationBell
                  counts={pendingCounts}
                  inline
                  trigger={<SidebarProfileIdentity profile={profile} />}
                  triggerClassName="p-1"
                />
              ) : (
                <SidebarProfileIdentity profile={profile} />
              )
            ) : unreadNotificationCount > 0 ? (
              <UserNotificationBell
                notifications={userNotifications}
                unreadCount={unreadNotificationCount}
                inline
                trigger={<SidebarProfileIdentity profile={profile} />}
                triggerClassName="p-1"
              />
            ) : (
              <SidebarProfileIdentity profile={profile} />
            )}
            <Link
              href="/my"
              className="mt-4 flex min-h-11 items-center justify-between rounded-xl border border-border bg-background/70 px-3 text-sm font-semibold text-foreground/80 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:shadow-[0_7px_16px_rgba(88,76,68,0.10)]"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="size-4 text-brand-sage" aria-hidden />
                마이페이지
              </span>
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
            </Link>
            {(profile.role === "staff" || profile.role === "admin") && (
              <Link
                href="/admin"
                className="mt-2 flex min-h-10 items-center justify-between rounded-xl border border-border bg-card/70 px-3 text-xs font-semibold text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5"
              >
                <span className="flex items-center gap-2">
                  <Settings2 className="size-4 text-primary" aria-hidden />
                  관리자 페이지
                </span>
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
              </Link>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3">
              <button
                type="button"
                onClick={toggleTheme}
                className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-secondary text-xs font-semibold text-foreground/80 transition-colors hover:bg-accent"
              >
                {resolvedTheme === "dark" ? (
                  <Sun className="size-4 text-brand-sage" aria-hidden />
                ) : (
                  <Moon className="size-4 text-brand-sage" aria-hidden />
                )}
                {resolvedTheme === "dark" ? "라이트모드" : "다크모드"}
              </button>
              <form action={signOut}>
                <button
                  type="submit"
                  className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-secondary text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
                >
                  <LogOut className="size-4" aria-hidden />
                  로그아웃
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="text-center">
            <BrandIcon name="profile" size={38} decorative />
            <p className="mt-2 text-sm font-semibold text-foreground">
              로그인하고 함께해요
            </p>
            <Link
              href="/login"
              className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-coral-hover hover:shadow-[0_8px_17px_rgba(201,112,82,0.22)]"
            >
              로그인
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-secondary text-xs font-semibold text-foreground/80"
            >
              {resolvedTheme === "dark" ? (
                <Sun className="size-4 text-brand-sage" aria-hidden />
              ) : (
                <Moon className="size-4 text-brand-sage" aria-hidden />
              )}
              {resolvedTheme === "dark" ? "라이트모드" : "다크모드"}
            </button>
          </div>
        )}
      </section>

      <section aria-labelledby={`${idPrefix}favorite-menu-heading`}>
        <div className="flex min-h-9 items-center justify-between px-2">
          <h2
            id={`${idPrefix}favorite-menu-heading`}
            className="text-xs font-semibold tracking-wide text-muted-foreground"
          >
            내 즐겨찾기
          </h2>
          {profile && (
            <button
              type="button"
              onClick={openEditor}
              className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl text-primary transition-all duration-200 hover:-translate-y-0.5 hover:bg-card hover:shadow-[0_6px_14px_rgba(88,76,68,0.10)]"
              aria-label="즐겨찾기 추가 및 편집"
              aria-expanded={editing}
            >
              <CirclePlus className="size-5" aria-hidden />
            </button>
          )}
        </div>
        <nav className="grid gap-1" aria-label="즐겨찾기 목록">
          {selectedItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-foreground/80 transition-all duration-200 hover:-translate-y-0.5 hover:bg-card hover:text-primary hover:shadow-[0_7px_16px_rgba(88,76,68,0.10)]"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-card transition-transform duration-200 group-hover:scale-105">
                <BrandIcon name={item.icon} size={20} decorative />
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </nav>
        {favoriteEditor}
      </section>

      <SidebarMenu idPrefix={idPrefix} />
    </div>
  )

  if (variant === "mobile") {
    return <div className="p-3">{content}</div>
  }

  return (
    <aside
      className="admin-sidebar-scroll sticky top-20 hidden max-h-[calc(100vh-6rem)] self-start overflow-y-auto rounded-[26px] border border-sidebar-border bg-sidebar p-4 shadow-[0_16px_35px_rgba(88,76,68,0.11)] lg:block"
      aria-label="회원 및 게시판 메뉴"
    >
      {content}
    </aside>
  )
}

function SidebarProfileIdentity({ profile }: { profile: Profile }) {
  return (
    <span className="flex w-full min-w-0 items-center gap-3">
      <span className="relative size-12 shrink-0 overflow-hidden rounded-full border-2 border-border bg-muted">
        {profile.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt={profile.nickname}
            fill
            sizes="48px"
            className="object-cover"
          />
        ) : (
          <User className="size-full p-2.5 text-primary" aria-hidden />
        )}
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block break-all font-semibold leading-snug text-foreground">
          {profile.nickname}님
        </span>
        <span className="mt-1 block text-xs text-muted-foreground">
          {ROLE_LABEL[profile.role]}
        </span>
      </span>
    </span>
  )
}

function SidebarMenu({ idPrefix }: { idPrefix: string }) {
  return (
    <>
      <section aria-labelledby={`${idPrefix}board-menu-heading`}>
        <h2
          id={`${idPrefix}board-menu-heading`}
          className="px-2 text-xs font-semibold tracking-wide text-muted-foreground"
        >
          게시판
        </h2>
        <nav className="mt-2 grid gap-1" aria-label="게시판 목록">
          <SidebarLink href="/daily?category=일상" icon={<BrandIcon name="camera" size={16} decorative />} label="일상" />
          <SidebarLink href="/daily?category=자유게시판" icon={<BrandIcon name="chat" size={16} decorative />} label="자유게시판" />
          <SidebarLink href="/daily?category=봉사 후기" icon={<BrandIcon name="volunteer" size={16} decorative />} label="봉사 후기" />
          <SidebarLink href="/stories" icon={<BrandIcon name="heart" size={16} decorative />} label="입양 후기" />
          <SidebarLink href="/notice" icon={<BrandIcon name="notification" size={16} decorative />} label="공지사항" />
        </nav>
      </section>
      <section aria-labelledby={`${idPrefix}participation-menu-heading`}>
        <h2
          id={`${idPrefix}participation-menu-heading`}
          className="px-2 text-xs font-semibold tracking-wide text-muted-foreground"
        >
          함께하기
        </h2>
        <nav className="mt-2 grid gap-1" aria-label="참여 메뉴">
          <SidebarLink href="/dogs" icon={<BrandIcon name="dog" size={16} decorative />} label="입양 대기 강아지" />
          <SidebarLink href="/cats" icon={<BrandIcon name="paw" size={16} decorative />} label="보호 중인 고양이" />
          <SidebarLink href="/calendar" icon={<BrandIcon name="calendar" size={16} decorative />} label="활동 일정" />
          <SidebarLink href="/volunteer" icon={<BrandIcon name="volunteer" size={16} decorative />} label="봉사 신청" />
          <SidebarLink href="/adopt" icon={<BrandIcon name="adopted" size={16} decorative />} label="입양 문의" />
          <SidebarLink href="/donate" icon={<BrandIcon name="heart" size={16} decorative />} label="후원하기" />
        </nav>
      </section>
      <section aria-labelledby={`${idPrefix}center-menu-heading`}>
        <h2
          id={`${idPrefix}center-menu-heading`}
          className="px-2 text-xs font-semibold tracking-wide text-muted-foreground"
        >
          센터 안내
        </h2>
        <nav className="mt-2 grid gap-1" aria-label="센터 안내">
          <SidebarLink href="/about" icon={<BrandIcon name="home-shelter" size={16} decorative />} label="센터 소개" />
          <SidebarLink href="/contact" icon={<BrandIcon name="location" size={16} decorative />} label="오시는 길" />
        </nav>
      </section>
    </>
  )
}

function SidebarLink({
  href,
  icon,
  label,
}: {
  href: string
  icon: ReactNode
  label: string
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [targetPath, targetQuery] = href.split("?")
  const targetParams = new URLSearchParams(targetQuery ?? "")
  const queryMatches = Array.from(targetParams.entries()).every(
    ([key, value]) => searchParams.get(key) === value
  )
  const isActive =
    (pathname === targetPath || pathname.startsWith(`${targetPath}/`)) &&
    queryMatches

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-card hover:text-primary hover:shadow-[0_7px_16px_rgba(88,76,68,0.10)]",
        isActive
          ? "bg-card font-semibold text-primary shadow-[0_7px_16px_rgba(88,76,68,0.10)]"
          : "text-foreground/80"
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-card/75 transition-transform duration-200 group-hover:scale-105 [&>img]:size-4 [&>svg]:size-4 [&>svg]:text-primary/70">
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </Link>
  )
}
