import type { Metadata } from "next"
import Link from "next/link"
import { CalendarDays, List } from "lucide-react"

import {
  CategoryFilter,
  listEventsInRange,
  MonthGrid,
  MonthNav,
  type EventCategory,
} from "@/features/events"
import { monthRange, yearMonthKst, todayKst } from "@/features/events/lib/date"
import { createClient } from "@/shared/lib/supabase/server"

export const metadata: Metadata = { title: "일정 (캘린더)" }
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

export default async function CalendarGridPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string; cat?: string }>
}) {
  const params = await searchParams
  const yearMonth =
    params.ym && YM_RE.test(params.ym) ? params.ym : yearMonthKst(todayKst())
  const categories = parseCategories(params.cat)

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const isMember = !!session?.user

  const { from, to } = monthRange(yearMonth)
  const events = await listEventsInRange({
    from,
    to,
    categories: categories.length > 0 ? categories : undefined,
  })

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 md:py-16">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-foreground md:text-4xl">
            <CalendarDays className="size-7 text-primary" aria-hidden />
            일정 (캘린더)
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            월별로 일정을 한눈에 확인하세요.
          </p>
        </div>
        <Link
          href="/calendar"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <List className="size-3.5" aria-hidden />
          리스트로 보기
        </Link>
      </header>

      <MonthNav
        yearMonth={yearMonth}
        basePath="/calendar/grid"
        searchParams={{
          cat: categories.length > 0 ? categories.join(",") : undefined,
        }}
      />

      <CategoryFilter
        active={categories}
        basePath="/calendar/grid"
        searchParams={{ ym: yearMonth }}
      />

      <MonthGrid
        yearMonth={yearMonth}
        events={events}
        hrefBase="/calendar"
        maskNames={!isMember}
        readOnly
      />
    </div>
  )
}
