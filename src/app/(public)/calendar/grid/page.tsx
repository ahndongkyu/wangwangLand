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

  // 로그인하지 않은 사용자는 일정 페이지 접근 불가.
  if (!session?.user) redirect("/login")

  const isMember = true

  // 관리자/운영진 여부 — 캘린더에서 바로 일정 관리 진입 가능하게
  let isStaff = false
  if (session?.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle()
    if (profile && (profile.role === "admin" || profile.role === "staff")) {
      isStaff = true
    }
  }

  const { from, to } = monthRange(yearMonth)
  const events = await listEventsInRange({
    from,
    to,
    categories: categories.length > 0 ? categories : undefined,
    includeInternal: isStaff, // 관리자에게는 내부 일정도 노출
  })

  return (
    <div className="mx-auto w-full max-w-5xl px-3 py-7 sm:px-4 sm:py-12 md:py-16">
      <header className="mb-5 flex items-end justify-between gap-3 sm:mb-6 sm:flex-wrap">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
            <CalendarDays className="size-6 text-primary sm:size-7" aria-hidden />
            <span className="sm:hidden">일정</span>
            <span className="hidden sm:inline">일정 (캘린더)</span>
          </h1>
          <p className="mt-1.5 text-xs text-muted-foreground sm:mt-2 sm:text-sm">
            월별 봉사·행사 일정을 확인하세요.
          </p>
        </div>
        <Link
          href="/calendar"
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground sm:gap-1.5 sm:px-3 sm:text-xs"
        >
          <List className="size-3.5" aria-hidden />
          목록 보기
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
        hrefBase={isStaff ? "/admin/calendar" : "/calendar"}
        maskNames={!isMember}
        readOnly={!isStaff}
      />
    </div>
  )
}
