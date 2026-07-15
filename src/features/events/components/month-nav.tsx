import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { shiftMonth, yearMonthKst, todayKst } from "../lib/date"
import { cn } from "@/shared/lib/utils"

interface Props {
  yearMonth: string
  /** 월 변경 시 보낼 base path */
  basePath: string
  /** 추가로 보존할 쿼리 파라미터 */
  searchParams?: Record<string, string | undefined>
}

/**
 * "< 2026년 4월 > [오늘]" 헤더 — 캘린더 페이지 공통.
 */
export function MonthNav({ yearMonth, basePath, searchParams = {} }: Props) {
  const [y, m] = yearMonth.split("-").map(Number)
  const prev = shiftMonth(yearMonth, -1)
  const next = shiftMonth(yearMonth, 1)
  const todayYm = yearMonthKst(todayKst())
  const onToday = yearMonth === todayYm

  function buildHref(ym: string): string {
    const sp = new URLSearchParams()
    sp.set("ym", ym)
    for (const [k, v] of Object.entries(searchParams)) {
      if (v) sp.set(k, v)
    }
    return `${basePath}?${sp.toString()}`
  }

  return (
    <>
      <div className="mb-4 sm:hidden">
        <div className="grid grid-cols-[2.75rem_1fr_2.75rem] items-center gap-2">
          <Link
            href={buildHref(prev)}
            className="flex size-11 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-sm transition-colors active:bg-secondary"
            aria-label="이전 달"
          >
            <ChevronLeft className="size-5" />
          </Link>

          <h2 className="text-center text-xl font-bold tracking-tight text-foreground">
            {y}년 {m}월
          </h2>

          <Link
            href={buildHref(next)}
            className="flex size-11 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-sm transition-colors active:bg-secondary"
            aria-label="다음 달"
          >
            <ChevronRight className="size-5" />
          </Link>
        </div>

        <div className="mt-2 flex justify-center">
          <Link
            href={buildHref(todayYm)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
              onToday
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground active:bg-secondary"
            )}
          >
            오늘
          </Link>
        </div>
      </div>

      <div className="mb-4 hidden items-center justify-between gap-2 sm:flex">
      <div className="flex items-center gap-1">
        <Link
          href={buildHref(prev)}
          className="flex size-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary"
          aria-label="이전 달"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <Link
          href={buildHref(next)}
          className="flex size-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary"
          aria-label="다음 달"
        >
          <ChevronRight className="size-4" />
        </Link>
        <Link
          href={buildHref(todayYm)}
          className={cn(
            "ml-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
            onToday
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground hover:bg-secondary"
          )}
        >
          오늘
        </Link>
      </div>

      <h2 className="text-lg font-bold text-foreground sm:text-xl">
        {y}년 {m}월
      </h2>

      <div className="w-[120px]" aria-hidden />
      </div>
    </>
  )
}
