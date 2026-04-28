import type { Metadata } from "next"
import Link from "next/link"
import { CalendarDays } from "lucide-react"

import {
  CategoryFilter,
  listEventsInRange,
  MonthGrid,
  MonthNav,
  type EventCategory,
} from "@/features/events"
import { monthRange, todayKst, yearMonthKst } from "@/features/events/lib/date"
import { buttonVariants } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

export const metadata: Metadata = { title: "일정 관리" }
export const dynamic = "force-dynamic"

const VALID_CATS: EventCategory[] = ["volunteer", "event", "closed"]
const YM_RE = /^\d{4}-\d{2}$/

function parseCategories(raw: string | undefined): EventCategory[] {
  if (!raw) return []
  return raw
    .split(",")
    .map((s) => s.trim() as EventCategory)
    .filter((c) => VALID_CATS.includes(c))
}

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string; cat?: string }>
}) {
  const params = await searchParams
  const yearMonth =
    params.ym && YM_RE.test(params.ym) ? params.ym : yearMonthKst(todayKst())
  const categories = parseCategories(params.cat)

  const { from, to } = monthRange(yearMonth)
  const events = await listEventsInRange({
    from,
    to,
    categories: categories.length > 0 ? categories : undefined,
    includeInternal: true,
  })

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground md:text-3xl">
            <CalendarDays className="size-6 text-primary" aria-hidden />
            일정 관리
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            봉사·행사·휴무 일정을 등록·수정합니다.
          </p>
        </div>
        <Link href="/admin/calendar/new" className={cn(buttonVariants())}>
          + 새 일정
        </Link>
      </header>

      <MonthNav
        yearMonth={yearMonth}
        basePath="/admin/calendar"
        searchParams={{
          cat: categories.length > 0 ? categories.join(",") : undefined,
        }}
      />

      <CategoryFilter
        active={categories}
        basePath="/admin/calendar"
        searchParams={{ ym: yearMonth }}
      />

      <MonthGrid
        yearMonth={yearMonth}
        events={events}
        hrefBase="/admin/calendar"
        addHrefBase="/admin/calendar/new"
      />
    </div>
  )
}
