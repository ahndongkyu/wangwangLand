"use client"

import { useTransition, useRef, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronRight, LogOut, Moon, Settings, Sun, User } from "lucide-react"
import { signOut } from "../api/actions"
import { useTheme } from "@/shared/components/theme-provider"
import { RoleBadge } from "@/shared/components/role-badge"
import type { Profile } from "../api/queries"

export function UserMenu({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
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

  function handleSignOut() {
    setOpen(false)
    startTransition(() => signOut())
  }

  const isStaff = profile.role === "staff" || profile.role === "admin"

  return (
    <div ref={ref} className="relative">
      {/* 트리거 버튼 */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className="flex items-center gap-2 rounded-full px-1 transition-opacity hover:opacity-80 disabled:opacity-50 outline-none"
        aria-label="내 계정"
      >
        <div className="relative size-9 shrink-0 overflow-hidden rounded-full border-2 border-primary/30 bg-muted">
          {profile.avatar_url ? (
            <Image src={profile.avatar_url} alt={profile.nickname} fill className="object-cover" />
          ) : (
            <User className="size-full p-1.5 text-muted-foreground" />
          )}
        </div>
        <div className="hidden flex-col items-center gap-0.5 sm:flex">
          <RoleBadge role={profile.role} />
          <span className="max-w-[80px] truncate text-sm font-medium leading-snug text-foreground">
            {profile.nickname}
          </span>
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-xl border border-border bg-popover shadow-[0_12px_32px_rgba(0,0,0,0.12)]">

          {/* ── 프로필 헤더 (마이페이지 링크) ── */}
          <Link
            href="/my"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/60"
          >
            <div className="relative size-9 shrink-0 overflow-hidden rounded-full border-2 border-primary/20 bg-muted">
              {profile.avatar_url ? (
                <Image src={profile.avatar_url} alt={profile.nickname} fill className="object-cover" />
              ) : (
                <User className="size-full p-1.5 text-muted-foreground" />
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
              <RoleBadge role={profile.role} />
              <p className="max-w-full truncate text-sm font-semibold text-foreground">
                {profile.nickname}
              </p>
            </div>
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" />
          </Link>

          <div className="h-px bg-border" />

          {/* ── 운영진 전용: 어드민 진입 ── */}
          {isStaff && (
            <>
              <div className="p-1.5">
                <DropdownItem
                  href="/admin"
                  icon={<Settings className="size-4" />}
                  label="어드민 페이지"
                  accent
                  onClose={() => setOpen(false)}
                />
              </div>
              <div className="h-px bg-border" />
            </>
          )}

          {/* ── 테마 토글 + 로그아웃 (한 블록) ── */}
          <div className="space-y-0.5 p-1.5">
            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-secondary"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-secondary">
                {isDark ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
              </span>
              <span className="flex-1 text-left">{isDark ? "다크 모드" : "라이트 모드"}</span>
              <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                전환
              </span>
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-destructive/10">
                <LogOut className="size-3.5" />
              </span>
              로그아웃
            </button>
          </div>

        </div>
      )}
    </div>
  )
}

function DropdownItem({
  href,
  icon,
  label,
  accent,
  onClose,
}: {
  href: string
  icon: React.ReactNode
  label: string
  accent?: boolean
  onClose: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
        accent
          ? "font-medium text-primary hover:bg-primary/10"
          : "text-foreground hover:bg-secondary"
      }`}
    >
      <span className={`flex size-7 shrink-0 items-center justify-center rounded-md ${
        accent ? "bg-primary/10" : "bg-secondary"
      }`}>
        {icon}
      </span>
      {label}
    </Link>
  )
}
