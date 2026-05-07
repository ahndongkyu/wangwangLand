import { cn } from "@/shared/lib/utils"

const BADGE_STYLES: Record<string, string> = {
  공지: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  이벤트: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  모집: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  행사: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
}

const DEFAULT_STYLE = "bg-secondary text-muted-foreground"

/** "[이벤트] 제목" 형태 제목에서 prefix 추출 */
export function parseNoticePrefix(title: string): string | null {
  const match = title.match(/^\[(.+?)\]/)
  return match ? match[1] : null
}

/** 목록 표시용: prefix 제거한 순수 제목 반환 */
export function stripNoticePrefix(title: string): string {
  return title.replace(/^\[.+?\]\s*/, "")
}

interface Props {
  title: string
  className?: string
}

export function NoticeTypeBadge({ title, className }: Props) {
  const prefix = parseNoticePrefix(title)
  if (!prefix) return null

  const style = BADGE_STYLES[prefix] ?? DEFAULT_STYLE

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        style,
        className
      )}
    >
      {prefix}
    </span>
  )
}
