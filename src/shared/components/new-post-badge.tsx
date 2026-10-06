"use client"

import { useCallback, useSyncExternalStore } from "react"
import { isRecentPost, NEW_POST_WINDOW_MS } from "@/shared/lib/recent-post"

const serverSnapshot = () => false

/** 서버·브라우저 시각 차이로 인한 hydration 불일치를 피하고 만료 시 갱신한다. */
export function NewPostBadge({ date }: { date: string }) {
  const subscribe = useCallback((notify: () => void) => {
    const now = Date.now()
    if (!isRecentPost(date, now)) return () => {}
    const timer = window.setTimeout(notify, Date.parse(date) + NEW_POST_WINDOW_MS - now)
    // 백그라운드 탭의 타이머 제한이 해제될 때도 표시를 재확인한다.
    document.addEventListener("visibilitychange", notify)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener("visibilitychange", notify)
    }
  }, [date])
  const snapshot = useCallback(() => isRecentPost(date, Date.now()), [date])
  const fresh = useSyncExternalStore(subscribe, snapshot, serverSnapshot)

  if (!fresh) return null
  return <span className="home-new-post-badge inline-block shrink-0 self-start text-xs font-semibold leading-5 text-primary" aria-label="새 글"><span aria-hidden="true">N</span></span>
}
