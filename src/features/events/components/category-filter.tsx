import Link from "next/link"

import { CATEGORY_COLOR, CATEGORY_LABEL, type EventCategory } from "../types"
import { cn } from "@/shared/lib/utils"

interface Props {
  /** 현재 선택된 카테고리들 (검은색 활성). 비어있으면 전체. */
  active: EventCategory[]
  /** href base */
  basePath: string
  /** 추가 쿼리 보존 */
  searchParams?: Record<string, string | undefined>
  /** 노출할 카테고리 칩. 기본 3개. 관리자 페이지에선 상담 카테고리 추가 가능. */
  categories?: EventCategory[]
}

// 필터 칩에는 기본 3개만 노출. 'custom' 은 자유 입력이라 필터 단위로 의미가 없음.
const DEFAULT_CATEGORIES: EventCategory[] = ["volunteer", "event", "closed"]

export function CategoryFilter({
  active,
  basePath,
  searchParams = {},
  categories: CATEGORIES = DEFAULT_CATEGORIES,
}: Props) {
  const isAll = active.length === 0 || active.length === CATEGORIES.length

  function buildHref(next: EventCategory[]): string {
    const sp = new URLSearchParams()
    if (next.length > 0 && next.length < CATEGORIES.length) {
      sp.set("cat", next.join(","))
    }
    for (const [k, v] of Object.entries(searchParams)) {
      if (v) sp.set(k, v)
    }
    const qs = sp.toString()
    return qs ? `${basePath}?${qs}` : basePath
  }

  function toggle(c: EventCategory): EventCategory[] {
    if (isAll) return CATEGORIES.filter((x) => x !== c)
    if (active.includes(c)) {
      const next = active.filter((x) => x !== c)
      return next.length === 0 ? [] : next
    }
    return [...active, c]
  }

  return (
    <div className="-mx-3 mb-4 flex items-center gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
      <Link
        href={buildHref([])}
        className={cn(
          "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:py-1",
          isAll
            ? "bg-foreground text-background"
            : "bg-secondary text-muted-foreground hover:text-foreground"
        )}
      >
        전체
      </Link>
      {CATEGORIES.map((c) => {
        const isActive = !isAll && active.includes(c)
        const color = CATEGORY_COLOR[c]
        return (
          <Link
            key={c}
            href={buildHref(toggle(c))}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:py-1",
              isActive
                ? cn(color.soft, color.softText)
                : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            <span aria-hidden className={cn("size-2 rounded-full", color.dot)} />
            {CATEGORY_LABEL[c]}
          </Link>
        )
      })}
    </div>
  )
}
