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
}

const CATEGORIES: EventCategory[] = ["volunteer", "event", "closed"]

export function CategoryFilter({ active, basePath, searchParams = {} }: Props) {
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
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Link
        href={buildHref([])}
        className={cn(
          "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
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
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
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
