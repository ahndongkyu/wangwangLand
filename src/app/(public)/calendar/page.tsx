import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
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

export const metadata: Metadata = {
  title: "일정",
  description: "왕왕랜드의 월별 봉사·행사 일정을 확인하세요.",
}
export const dynamic = "force-dynamic"

const VALID_CATS: EventCategory[] = [
  "volunteer",
  "regular_volunteer",
  "event",
  "closed",
  "custom",
]
const YM_RE = /^\d{4}-\d{2}$/

function parseCategories(raw: string | undefined): EventCategory[] {
  if (!raw) return []
  return raw
    .split(",")
    .map((value) => value.trim() as EventCategory)
    .filter((category) => VALID_CATS.includes(category))
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string; cat?: string }>
}) {
  const params = await searchParams
  const yearMonth =
    params.ym && YM_RE.test(params.ym) ? params.ym : yearMonthKst(todayKst())
  const categories = parseCategories(params.cat)

  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle()
  const isStaff = profile?.role === "admin" || profile?.role === "staff"

  const { from, to } = monthRange(yearMonth)
  const events = await listEventsInRange({
    from,
    to,
    categories: categories.length > 0 ? categories : undefined,
    includeInternal: isStaff,
  })

  return (
    <div className="mx-auto w-full max-w-5xl px-3 py-7 sm:px-4 sm:py-12 md:py-16">
      <header className="mb-5 flex items-end justify-between gap-3 sm:mb-6 sm:flex-wrap">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
            <CalendarDays className="size-6 text-primary sm:size-7" aria-hidden />
            일정
          </h1>
          <p className="mt-1.5 text-xs text-muted-foreground sm:mt-2 sm:text-sm">
            월별 봉사·행사 일정을 확인하세요.
          </p>
        </div>
        <Link
          href="/calendar/list"
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground sm:gap-1.5 sm:px-3 sm:text-xs"
        >
          <List className="size-3.5" aria-hidden />
          내 일정
        </Link>
      </header>

      <MonthNav
        yearMonth={yearMonth}
        basePath="/calendar"
        searchParams={{
          cat: categories.length > 0 ? categories.join(",") : undefined,
        }}
      />

      <CategoryFilter
        active={categories}
        basePath="/calendar"
        searchParams={{ ym: yearMonth }}
      />

      <MonthGrid
        yearMonth={yearMonth}
        events={events}
        hrefBase={isStaff ? "/admin/calendar" : "/calendar"}
        maskNames={false}
        readOnly={!isStaff}
      />
    </div>
  )
}
