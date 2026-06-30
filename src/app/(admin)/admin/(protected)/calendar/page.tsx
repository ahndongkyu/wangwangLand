import type { Metadata } from "next"
import Link from "next/link"
import { CalendarDays, Inbox } from "lucide-react"

import {
  CategoryFilter,
  listEventsInRange,
  MonthGrid,
  MonthNav,
  type EventCategory,
} from "@/features/events"
import { monthRange, todayKst, yearMonthKst } from "@/features/events/lib/date"
import { listVolunteerApplications } from "@/features/applications"
import { buttonVariants } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"
import { MonthShareButton } from "./_components/month-share-button"

export const metadata: Metadata = { title: "일정 관리" }
export const dynamic = "force-dynamic"

const VALID_CATS: EventCategory[] = [
  "volunteer",
  "regular_volunteer",
  "event",
  "closed",
  "adoption_consult",
]
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
  const [events, { rows: pendingApps }] = await Promise.all([
    listEventsInRange({
      from,
      to,
      categories: categories.length > 0 ? categories : undefined,
      includeInternal: true,
    }),
    // 처리 대기 봉사 신청 (접수·검토중)
    listVolunteerApplications({ status: "접수", limit: 5 }),
  ])

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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <CategoryFilter
          active={categories}
          basePath="/admin/calendar"
          searchParams={{ ym: yearMonth }}
          categories={VALID_CATS}
        />
        <MonthShareButton yearMonth={yearMonth} />
      </div>

      <div id="admin-month-grid-capture" className="bg-background">
        <MonthGrid
          yearMonth={yearMonth}
          events={events}
          hrefBase="/admin/calendar"
          addHrefBase="/admin/calendar/new"
        />
      </div>

      {/* 처리 대기 봉사 신청 → 캘린더에 등록 */}
      {pendingApps.length > 0 && (
        <section className="mt-6 rounded-lg border border-border bg-card">
          <header className="flex items-center justify-between border-b border-border bg-secondary/40 px-4 py-2.5">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Inbox className="size-4 text-muted-foreground" aria-hidden />
              처리 대기 봉사 신청 ({pendingApps.length})
            </h2>
            <Link
              href="/admin/applications"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              전체 보기 →
            </Link>
          </header>
          <ul className="divide-y divide-border">
            {pendingApps.map((app) => (
              <li
                key={app.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"
              >
                <span className="font-medium text-foreground">
                  {app.applicant_name}
                  {app.party_size > 1 && ` 외 ${app.party_size - 1}명`}
                </span>
                <span className="text-xs text-muted-foreground">
                  {(app.available_dates && app.available_dates.length > 0
                    ? app.available_dates.join(", ")
                    : app.available_days.length > 0
                      ? `${app.available_days.join(", ")}요일`
                      : "날짜 미정") +
                    (app.available_time ? ` · ${app.available_time}` : "")}
                </span>
                <Link
                  href={`/admin/calendar/new?from=${app.id}`}
                  className="ml-auto rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/15"
                >
                  캘린더에 등록 →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
