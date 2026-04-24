"use client"

import { useTransition, useRef, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { LogOut, User } from "lucide-react"
import { signOut } from "../api/actions"
import type { Profile } from "../api/queries"

const ROLE_LABEL: Record<Profile["role"], string> = {
  member: "일반회원",
  full_member: "정회원",
  staff: "운영진",
  admin: "최고관리자",
}

const ROLE_COLOR: Record<Profile["role"], string> = {
  member: "bg-muted text-muted-foreground",
  full_member: "bg-primary/15 text-primary",
  staff: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  admin: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
}

export function UserMenu({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

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

  return (
    <div ref={ref} className="relative">
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
        <span className="hidden max-w-[80px] truncate text-sm font-medium text-foreground sm:block">
          {profile.nickname}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-52 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
          {/* 프로필 헤더 */}
          <div className="border-b border-border px-4 py-3">
            <p className="flex items-center gap-1.5 font-semibold text-foreground">
              {profile.nickname}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${ROLE_COLOR[profile.role]}`}>
                {ROLE_LABEL[profile.role]}
              </span>
            </p>
          </div>

          <div className="p-1">
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-secondary"
            >
              <User className="size-4" />
              프로필 설정
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
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
