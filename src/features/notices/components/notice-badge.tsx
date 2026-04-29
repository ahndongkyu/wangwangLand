"use client"

import { useEffect, useState } from "react"

import { useLastNoticeSeenAt } from "../hooks/use-notice-seen"
import type { RecentNoticeMeta } from "../types"
import { cn } from "@/shared/lib/utils"

interface Props {
  /** 서버에서 prefetch 한 최근 발행 공지 메타. */
  notices: RecentNoticeMeta[]
  className?: string
}

/**
 * 공지사항 "NEW" 뱃지.
 *
 * 표시 규칙 (클라이언트만):
 * - 사용자의 마지막 공지 열람 이후 발행된 공지가 있으면 뱃지 표시
 * - 상단 고정(`is_pinned`) 공지는 열람 이후라도 여전히 핀으로 걸려 있으면
 *   '새로 올라온' 것이 아니므로 뱃지에 영향 없음 (시간 비교만 사용)
 * - 오리엔테이션: "N" 한 글자로 표기 (개수 X)
 */
export function NoticeBadge({ notices, className }: Props) {
  const lastSeen = useLastNoticeSeenAt()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // SSR 단계에선 뱃지 안 보이게. hydration 후 localStorage 기준으로 판정.
  if (!mounted) return null

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
