"use client"

import { useEffect, useState } from "react"

import { useLastNoticeSeenAt } from "../hooks/use-notice-seen"
import type { RecentNoticeMeta } from "../types"
import { cn } from "@/shared/lib/utils"

interface Props {
  notices: RecentNoticeMeta[]
  /** 로그인 유저의 DB 열람 시각. 있으면 localStorage 대신 이 값 사용. */
  dbLastSeenAt?: string | null
  className?: string
}

export function NoticeBadge({ notices, dbLastSeenAt, className }: Props) {
  const localLastSeen = useLastNoticeSeenAt()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  // 로그인 유저: DB 값 / 비로그인: localStorage 값
  const lastSeen = dbLastSeenAt ?? localLastSeen
  const hasUnread = notices.some((n) => n.published_at > lastSeen)
  if (!hasUnread) return null

  return (
    <span
      className={cn(
        "animate-new-shine ml-1 inline-flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold leading-none text-white",
        className
      )}
      aria-label="새 공지 있음"
      title="새 공지 있음"
    >
      N
    </span>
  )
}
