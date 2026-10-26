"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"
import {
  CirclePlus,
  LogOut,
} from "lucide-react"

import type { Profile } from "@/features/members"
import type { UserNotification } from "@/features/notifications/api/queries"
import { signOut, updateHomeFavorites } from "@/features/members/api/actions"
import { LogoutForm } from "@/features/push/components/logout-form"
import { InstallAppButton } from "@/features/push/components/install-app"
import {
  HOME_FAVORITE_OPTIONS,
  type HomeFavoriteKey,
} from "@/shared/constants/home-navigation"
import type { PendingCounts } from "@/shared/lib/pending-counts"
import { cn } from "@/shared/lib/utils"

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
  variant = "desktop",
}: Props) {
  const router = useRouter()
  const [favorites, setFavorites] = useState(initialFavorites)
  const [draft, setDraft] = useState(initialFavorites)
  const [editing, setEditing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const sidebarRef = useRef<HTMLElement>(null)
  const [fitsViewport, setFitsViewport] = useState(false)

  useEffect(() => {
    if (variant !== "desktop") return
    const sidebar = sidebarRef.current
    if (!sidebar) return

    function updateFit() {
      if (!sidebar) return
      const height = sidebar.getBoundingClientRect().height
      const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
      // 상단 헤더와 여백 7rem, 하단 여백 1rem을 확보한다.
      setFitsViewport(height > 0 && height <= window.innerHeight - rem * 8)
    }

    const observer = new ResizeObserver(updateFit)
    observer.observe(sidebar)
    window.addEventListener("resize", updateFit)
    updateFit()
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", updateFit)
    }
  }, [variant])

  const selectedItems = favorites
    .map((key) => HOME_FAVORITE_OPTIONS.find((item) => item.key === key))
    .filter((item): item is (typeof HOME_FAVORITE_OPTIONS)[number] => !!item)
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
    <div className="space-y-8">
      <section aria-labelledby={`${idPrefix}favorite-menu-heading`}>
        <div className="flex min-h-6 items-center justify-between px-2">
          <h2
            id={`${idPrefix}favorite-menu-heading`}
            className="text-xs font-bold tracking-wide text-foreground/70"
          >
            내 즐겨찾기
          </h2>
          {profile && (
            <button
              type="button"
              onClick={openEditor}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-primary transition-colors duration-200 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
              aria-label="즐겨찾기 추가 및 편집"
              aria-expanded={editing}
            >
              <CirclePlus className="size-5" aria-hidden />
            </button>
          )}
        </div>
        <nav className="mt-2 grid gap-1 pl-3" aria-label="즐겨찾기 목록">
          {selectedItems.map((item) => (
            <SidebarLink key={item.key} href={item.href} label={item.label} />
          ))}
        </nav>
        {favoriteEditor}
      </section>

      <SidebarMenu idPrefix={idPrefix} />
      <InstallAppButton />
      {profile && <LogoutForm action={signOut}><button type="submit" className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><LogOut className="size-4" aria-hidden />로그아웃</button></LogoutForm>}
    </div>
  )

  if (variant === "mobile") {
    return <div className="p-3">{content}</div>
  }

  return (
    <aside
      ref={sidebarRef}
      className={cn(
        "hidden self-start rounded-[26px] border border-sidebar-border bg-sidebar p-4 shadow-[0_16px_35px_rgba(88,76,68,0.11)] lg:block",
        fitsViewport && "sticky top-28"
      )}
      aria-label="회원 및 게시판 메뉴"
    >
      {content}
    </aside>
  )
}

const MENU_GROUPS = [
  { label: "소식·이야기", items: [["/notice", "공지사항"], ["/daily", "왕왕랜드 이야기"]] },
  { label: "아이들·입양", items: [["/dogs", "입양 대기 강아지"], ["/cats", "보호 중인 고양이"], ["/adopt", "입양 문의"]] },
  { label: "봉사", items: [["/volunteer", "봉사 신청하기"], ["/calendar", "활동 일정"]] },
  { label: "후원", items: [["/donate", "후원하기"], ["/expenses", "지출 내역"]] },
  { label: "보호소 안내", items: [["/about", "센터 소개"], ["/contact", "오시는 길"]] },
] as const

function SidebarMenu({ idPrefix }: { idPrefix: string }) {
  return <>{MENU_GROUPS.map((group, index) => (
    <section key={group.label} aria-labelledby={`${idPrefix}menu-group-${index}`}>
      <h2 id={`${idPrefix}menu-group-${index}`} className="px-2 text-xs font-bold tracking-wide text-foreground/70">{group.label}</h2>
      <nav className="mt-2 grid gap-1 pl-3" aria-label={group.label}>
        {group.items.map(([href, label]) => <SidebarLink key={href} href={href} label={label} highlight={href === "/volunteer"} />)}
      </nav>
    </section>
  ))}</>
}

function SidebarLink({
  href,
  label,
  highlight = false,
}: {
  href: string
  label: string
  highlight?: boolean
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
        "relative flex min-h-11 items-center rounded-xl border border-transparent px-3 text-sm transition-[color,background-color,border-color,box-shadow] duration-200 hover:border-primary/20 hover:bg-card hover:text-primary hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar active:bg-primary/10 motion-reduce:transition-none",
        isActive
          ? "border-primary/20 bg-card font-semibold text-primary shadow-sm before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:rounded-full before:bg-primary"
          : "text-foreground/80",
        highlight && "volunteer-menu-link"
      )}
    >
      <span className={cn("truncate", highlight && "volunteer-menu-label font-medium text-primary")}>{label}</span>
    </Link>
  )
}
