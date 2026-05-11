import { cn } from "@/shared/lib/utils"
import type { DailyCategory } from "@/shared/types/database"

const BADGE_STYLES: Record<DailyCategory, string> = {
  "구조 소식":  "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  "봉사 현장":  "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  "시설 안내":  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "일상":       "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  "입소":       "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  "임시보호":   "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  "후원 소식":  "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  "봉사 후기":  "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
}

interface Props {
  category: DailyCategory | null | undefined
  className?: string
}

export function DailyCategoryBadge({ category, className }: Props) {
  if (!category) return null
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        BADGE_STYLES[category],
        className
      )}
    >
      {category}
    </span>
  )
}
