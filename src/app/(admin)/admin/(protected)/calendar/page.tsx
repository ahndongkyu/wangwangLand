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
import {
  formatVolunteerApplicantName,
  listVolunteerApplications,
} from "@/features/applications"
import { buttonVariants } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"
import { MonthShareButton } from "./_components/month-share-button"
import { validDate } from "@/features/applications/lib/admin-list"
import { getVolunteerVisitSummary } from "@/features/events/api/visit-summary"
import { createClient } from "@/shared/lib/supabase/server"

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
  searchParams: Promise<{ ym?: string; cat?: string; date?: string }>
}) {
  const params = await searchParams
  const yearMonth =
    params.ym && YM_RE.test(params.ym) ? params.ym : yearMonthKst(todayKst())
  const categories = parseCategories(params.cat)

  const { from, to } = monthRange(yearMonth)
  const [events, { rows: pendingApps, total: pendingTotal }] = await Promise.all([
    listEventsInRange({
      from,
      to,
      categories: categories.length > 0 ? categories : undefined,
      includeInternal: true,
    }),
    listVolunteerApplications({ statuses: ["접수", "검토중", "일정변경요청"], limit: 5 }),
  ])
  const volunteerVisits = await getVolunteerVisitSummary(events).catch(() => null)
  const client = await createClient()
  const { data: conflicts, error: conflictError } = await client.rpc("application_calendar_conflicts", { p_from: from, p_to: to })

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

      <nav aria-label="봉사 신청 처리 바로가기" className="mb-5 flex flex-wrap gap-2">
        {[["처리 필요", `처리 필요 ${pendingTotal}건`], ["접수", "새 접수"], ["검토중", "검토 중"], ["일정변경요청", "일정변경 요청"]].map(([status, label]) => (
          <Link key={status} href={`/admin/applications?type=volunteer&status=${encodeURIComponent(status)}`} className="inline-flex min-h-11 items-center rounded-lg border border-border bg-card px-3 text-sm transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring">{label}</Link>
        ))}
      </nav>

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
        {conflictError ? <p role="alert" className="mb-3 text-sm text-destructive">휴무·행사와 겹치는 확정 일정을 확인하지 못했습니다. 새로고침해 주세요.</p> : conflicts?.length > 0 && <section className="mb-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <h2 className="font-semibold">신청 제한일과 겹치는 확정 일정 {conflicts.length}건</h2>
          <p className="mt-1 text-xs text-muted-foreground">자동 취소되지 않았습니다. 신청자와 확인 후 일정을 조정해 주세요.</p>
          <ul className="mt-2">{conflicts.map((item: { event_id: string; reason: string }) => <li key={item.event_id}><Link href={`/admin/calendar/${item.event_id}`} className="inline-flex min-h-11 items-center text-sm text-primary underline">{events.find(event => event.id === item.event_id)?.title ?? "확정 일정 확인"} · {item.reason}</Link></li>)}</ul>
        </section>}
        <MonthGrid
          key={`${yearMonth}-${params.date ?? ""}`}
          yearMonth={yearMonth}
          events={events}
          hrefBase="/admin/calendar"
          addHrefBase="/admin/calendar/new"
          initialSelectedDate={params.date && validDate(params.date) ? params.date : undefined}
          categoryFilter={categories.join(",")}
          volunteerVisits={volunteerVisits}
        />
      </div>

      {/* 처리 대기 봉사 신청 → 캘린더에 등록 */}
      {pendingApps.length > 0 && (
        <section className="mt-6 rounded-lg border border-border bg-card">
          <header className="flex items-center justify-between border-b border-border bg-secondary/40 px-4 py-2.5">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Inbox className="size-4 text-muted-foreground" aria-hidden />
              처리 대기 봉사 신청 ({pendingTotal}건 · 최근 {pendingApps.length}건)
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
                  {formatVolunteerApplicantName(
                    app.applicant_name,
                    app.group_name
                  )}
                  {app.party_size > 1 && ` 외 ${app.party_size - 1}명`}
                </span>
                <span className="text-xs text-muted-foreground">
                  {app.status} ·
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
                  href={`/admin/applications/volunteer/${app.id}`}
                  className="ml-auto rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/15"
                >
                  신청 확인
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
