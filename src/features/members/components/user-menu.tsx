"use client"

import { useTransition, useRef, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ChevronRight,
  ClipboardList,
  ExternalLink,
  Heart,
  LogOut,
  Monitor,
  Moon,
  Settings,
  Sun,
  User,
} from "lucide-react"
import { signOut } from "../api/actions"
import { useTheme } from "@/shared/components/theme-provider"
import { UserName } from "@/shared/components/user-name"
import { cn } from "@/shared/lib/utils"
import type { Profile } from "../api/queries"

const ROLE_LABEL: Record<string, string> = {
  admin: "관리자",
  staff: "운영진",
  full_member: "정회원",
  member: "회원",
}

export function UserMenu({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)
  const { theme, setTheme } = useTheme()

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
          <UserName nickname={profile.nickname} role={profile.role} showTier={false} />
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-72 overflow-hidden rounded-2xl border border-border bg-popover shadow-[0_16px_40px_rgba(40,30,20,0.18)]">

          {/* ── 프로필 헤더 (다크 그린, 정보 표시용) ── */}
          <div className="flex items-center gap-3 bg-[#2A3D2F] px-4 py-3.5 dark:bg-[#1A2820]">
            <div className="relative size-11 shrink-0 overflow-hidden rounded-full border-2 border-white/20 bg-white/10">
              {profile.avatar_url ? (
                <Image src={profile.avatar_url} alt={profile.nickname} fill className="object-cover" />
              ) : (
                <User className="size-full p-2 text-white/70" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold text-white">
                {profile.nickname}
              </p>
              <p className="mt-0.5 text-[11px] text-[#9AB09E]">
                {ROLE_LABEL[profile.role] ?? "회원"}
              </p>
            </div>
          </div>

          {/* ── 내 활동 ── */}
          <div className="px-1.5 pt-2">
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.8px] text-muted-foreground">
              내 활동
            </p>
            <MenuItem
              href="/my/applications"
              icon={<ClipboardList className="size-4" />}
              label="내 신청 내역"
              onClose={() => setOpen(false)}
            />
            <MenuItem
              href="/my/donations"
              icon={<Heart className="size-4" />}
              label="내 후원 내역"
              onClose={() => setOpen(false)}
            />
            <MenuItem
              href="/my/likes"
              icon={<Heart className="size-4 fill-current" />}
              label="관심 아이"
              onClose={() => setOpen(false)}
            />
          </div>

          {/* ── 운영진 전용 ── */}
          {isStaff && (
            <>
              <div className="mx-3 my-2 h-px bg-border" />
              <div className="px-1.5">
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.8px] text-muted-foreground">
                  운영진
                </p>
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[#2A3D2F] transition-colors hover:bg-[#DCEBDE] dark:text-[#9AB09E] dark:hover:bg-[#1A2820]"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#DCEBDE] text-[#2A3D2F] dark:bg-[#1A2820] dark:text-[#9AB09E]">
                    <Settings className="size-4" />
                  </span>
                  <span className="flex-1">어드민 페이지</span>
                  <span className="rounded-full bg-[#2A3D2F] px-1.5 py-0.5 text-[9px] font-bold tracking-[0.5px] text-white dark:bg-[#9AB09E] dark:text-[#1A2820]">
                    STAFF
                  </span>
                  <ChevronRight className="size-3.5 text-muted-foreground/50" />
                </Link>
              </div>
            </>
          )}

          <div className="mx-3 my-2 h-px bg-border" />

          {/* ── 테마 (3-way 세그먼트) ── */}
          <div className="px-3 pb-2">
            <div className="flex items-center gap-3 py-1.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#FBF1CC] text-[#B89020] dark:bg-[rgba(234,191,73,0.18)] dark:text-[#EAB849]">
                <Sun className="size-4" />
              </span>
              <span className="flex-1 text-sm font-medium text-foreground">테마</span>
              <div className="inline-flex rounded-full bg-secondary p-0.5 gap-0.5">
                <ThemeSegBtn current={theme} value="light" onClick={setTheme} icon={<Sun className="size-3" />} />
                <ThemeSegBtn current={theme} value="dark" onClick={setTheme} icon={<Moon className="size-3" />} />
                <ThemeSegBtn current={theme} value="system" onClick={setTheme} icon={<Monitor className="size-3" />} />
              </div>
            </div>
          </div>

          {/* ── 푸터 액션 그리드 (관리자 사이드바 스타일) ── */}
          <div className="grid grid-cols-3 gap-1 border-t border-border bg-secondary/40 p-2">
            <Link
              href="/my"
              onClick={() => setOpen(false)}
              className="flex flex-col items-center gap-1 rounded-lg py-2 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ExternalLink className="size-4" />
              마이페이지
            </Link>
            <Link
              href="/my/likes"
              onClick={() => setOpen(false)}
              className="flex flex-col items-center gap-1 rounded-lg py-2 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Heart className="size-4" />
              관심 아이
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex flex-col items-center gap-1 rounded-lg py-2 text-[10px] font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="size-4" />
              로그아웃
            </button>
          </div>

        </div>
      )}
    </div>
  )
}

function MenuItem({
  href,
  icon,
  label,
  onClose,
}: {
  href: string
  icon: React.ReactNode
  label: string
  onClose: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      <ChevronRight className="size-3.5 text-muted-foreground/50" />
    </Link>
  )
}

function ThemeSegBtn({
  current,
  value,
  onClick,
  icon,
}: {
  current: string | undefined
  value: "light" | "dark" | "system"
  onClick: (v: "light" | "dark" | "system") => void
  icon: React.ReactNode
}) {
  const active = current === value
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      aria-label={value === "light" ? "라이트" : value === "dark" ? "다크" : "시스템"}
      title={value === "light" ? "라이트" : value === "dark" ? "다크" : "시스템"}
      className={cn(
        "flex size-7 items-center justify-center rounded-full transition-all",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
    </button>
  )
}
