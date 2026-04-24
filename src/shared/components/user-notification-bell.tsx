"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Bell } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale"
import { cn } from "@/shared/lib/utils"
import { markAllNotificationsRead, markNotificationRead } from "@/features/notifications/api/actions"
import type { UserNotification } from "@/features/notifications/api/queries"

const POST_PATH: Record<string, string> = {
  notice: "/notice",
  story: "/stories",
  daily: "/daily",
}

function notifLabel(n: UserNotification): string {
  const actor = n.actor?.nickname ?? "누군가"
  if (n.type === "reply_to_comment") return `${actor}님이 내 댓글에 답글을 달았어요`
  return `${actor}님이 내 게시글에 댓글을 달았어요`
}

interface Props {
  notifications: UserNotification[]
  unreadCount: number
}

export function UserNotificationBell({ notifications, unreadCount }: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const hasItems = notifications.length > 0

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  function handleClickNotif(n: UserNotification) {
    setOpen(false)
    const path = `${POST_PATH[n.post_type] ?? ""}/${n.post_id}`
    startTransition(async () => {
      await markNotificationRead(n.id)
      router.push(path)
    })
  }

  function handleMarkAll() {
    startTransition(async () => {
      await markAllNotificationsRead()
    })
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => hasItems && setOpen((v) => !v)}
        className={cn(
          "relative flex size-9 items-center justify-center rounded-full transition-colors",
          hasItems
            ? "text-foreground/70 hover:bg-secondary hover:text-foreground"
            : "text-foreground/40 cursor-default"
        )}
        aria-label={hasItems ? `알림 ${unreadCount}개` : "알림 없음"}
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 py-px text-[10px] font-bold leading-none text-destructive-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && hasItems && (
        <div className="absolute right-0 top-11 z-50 w-72 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <p className="text-xs font-semibold text-muted-foreground">알림</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                disabled={pending}
                className="text-xs text-primary hover:underline disabled:opacity-50"
              >
                모두 읽음
              </button>
            )}
          </div>

          <ul className="max-h-80 overflow-y-auto">
            {notifications.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => handleClickNotif(n)}
                  className={cn(
                    "w-full px-4 py-3 text-left transition-colors hover:bg-secondary",
                    !n.is_read && "bg-primary/5"
                  )}
                >
                  <p className="text-sm text-foreground leading-snug">
                    {!n.is_read && (
                      <span className="mr-1.5 inline-block size-1.5 rounded-full bg-primary align-middle" />
                    )}
                    {notifLabel(n)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ko })}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
