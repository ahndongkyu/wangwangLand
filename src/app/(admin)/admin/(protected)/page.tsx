import Link from "next/link"
import { getDashboardStats } from "@/features/applications/api/dashboard"
import { getApprovedVolunteerPeople } from "@/features/applications/api/queries"
import { applicationHref, validDate } from "@/features/applications/lib/admin-list"
import { listEventsInRange, MonthGrid, MonthNav } from "@/features/events"
import { getDashboardVisits } from "@/features/events/api/dashboard-visits"
import { dateKey, formatTimeKst, monthRange, yearMonthKst } from "@/features/events/lib/date"
import { getEventTitle } from "@/features/events/types"
import { requireAdmin } from "@/shared/lib/auth"
import { BrandIcon } from "@/shared/components/brand-icon"
import { createClient } from "@/shared/lib/supabase/server"
import { recordOperationError } from "@/features/operation-logs/server"
import { DashboardStatistics } from "./_components/dashboard-stats"

export const dynamic = "force-dynamic"
const shortcuts = [
  { href: "/admin/calendar/new", icon: "calendar", label: "새 일정", desc: "봉사·행사·휴무" },
  { href: "/admin/notices/new", icon: "notification", label: "공지 작성", desc: "새 소식 게시" },
  { href: "/admin/daily/new", icon: "camera", label: "이야기 작성", desc: "활동 기록" },
  { href: "/admin/stories/new", icon: "heart", label: "후기 작성", desc: "입양 후기" },
] as const

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ ym?: string; date?: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return <p role="alert">관리자 권한이 필요합니다.</p>
  const params = await searchParams
  const now = new Date()
  const today = dateKey(now)
  const currentMonth = yearMonthKst(now)
  const yearMonth = params.ym && /^\d{4}-(0[1-9]|1[0-2])$/.test(params.ym) ? params.ym : currentMonth
  const range = monthRange(yearMonth)
  const todayFrom = new Date(`${today}T00:00:00+09:00`).toISOString()
  const todayTo = new Date(Date.parse(todayFrom) + 86400000).toISOString()
  const calendarPromise = listEventsInRange({ ...range, includeInternal: true })
  const visitsPromise = (yearMonth === currentMonth ? calendarPromise.then(events => events.filter(event => dateKey(new Date(event.starts_at)) === today)) : listEventsInRange({ from: todayFrom, to: todayTo, includeInternal: true })).then(getDashboardVisits)
  const [events, stats, approvedPeople, visits] = await Promise.all([
    calendarPromise.catch(() => null), getDashboardStats(now).catch(() => null),
    getApprovedVolunteerPeople().catch(() => null), visitsPromise.catch(() => null),
  ])
  const client = await createClient()
  const conflictResult = await client.rpc("application_calendar_conflicts", { p_from: range.from, p_to: range.to })
  if (conflictResult.error) await recordOperationError("query", "dashboardCalendarConflicts", conflictResult.error, "admin")
  const conflicts = (conflictResult.data ?? []) as Array<{ event_id: string; reason: string }>
  const pending = [
    { label: "봉사 신청", hint: "접수·검토중", type: "volunteer", status: "승인 대기", count: stats ? stats.volunteer.접수 + stats.volunteer.검토중 : null },
    { label: "입양 상담", hint: "접수·검토중", type: "adoption", status: "승인 대기", count: stats ? stats.adoption.접수 + stats.adoption.검토중 : null },
    { label: "일정 변경", hint: "변경 요청", type: "volunteer", status: "일정변경요청", count: stats ? stats.volunteer.일정변경요청 : null },
  ]
  const volunteer = visits?.filter(event => event.kind === "volunteer")
  const adoption = visits?.filter(event => event.kind === "adoption")
  const selectedDate = params.date && validDate(params.date) && params.date.startsWith(yearMonth) ? params.date : yearMonth === currentMonth ? today : `${yearMonth}-01`

  return <div className="mx-auto w-full min-w-0 max-w-6xl space-y-6 px-4 py-5 md:space-y-8 md:px-0 md:py-0">
    <header><h1 className="text-xl font-bold sm:text-2xl">오늘의 운영 현황</h1><p className="mt-1 text-xs text-muted-foreground sm:text-sm">{now.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric", weekday: "long" })}</p></header>
    <section aria-labelledby="dashboard-shortcuts"><h2 id="dashboard-shortcuts" className="mb-3 text-base font-semibold">자주 하는 작업</h2>
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">{shortcuts.map(item => <Link key={item.href} href={item.href} className="flex min-h-16 items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/50 hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring sm:p-4"><span className="hidden size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 sm:flex"><BrandIcon name={item.icon} size={20} decorative /></span><span><span className="block text-sm font-semibold">{item.label}</span><span className="mt-0.5 block text-xs text-muted-foreground">{item.desc}</span></span></Link>)}</div>
    </section>
    <section aria-labelledby="dashboard-pending"><h2 id="dashboard-pending" className="mb-3 text-base font-semibold">처리할 신청</h2>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">{pending.map(item => <Link key={item.label} href={applicationHref({ type: item.type, status: item.status })} data-pending={item.count !== null && item.count > 0 ? "true" : "false"} className={`min-w-0 rounded-xl border bg-card p-3 transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring sm:p-5 ${item.count !== null && item.count > 0 ? "dashboard-pending-border border-primary/70" : "border-border"}`}><h3 className="text-xs font-medium sm:text-sm">{item.label}</h3><p className="my-2 text-2xl font-bold tabular-nums sm:text-3xl">{item.count === null ? "—" : item.count.toLocaleString("ko-KR")}<span className="ml-1 text-xs font-normal text-muted-foreground">건</span></p><p className="text-[11px] text-muted-foreground sm:text-xs">{item.hint}</p></Link>)}</div>
      {!stats && <p role="alert" className="mt-2 text-sm text-destructive">신청 건수를 불러오지 못했습니다. 목록에서 확인해 주세요.</p>}
    </section>
    <section aria-labelledby="dashboard-today">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 id="dashboard-today" className="text-base font-semibold">오늘 방문 예정</h2><Link href={`/admin/calendar?ym=${currentMonth}&date=${today}`} className="inline-flex min-h-11 items-center text-xs text-primary hover:underline">일정 보기</Link></div>
      {visits === null ? <p role="alert" className="rounded-xl border border-border bg-card p-4 text-sm text-destructive">오늘 방문 일정을 불러오지 못했습니다. 새로고침해 주세요.</p> : <div className="grid gap-3 sm:grid-cols-2 sm:gap-4" data-dashboard-visit-columns>
        {[{ kind: "volunteer", label: "봉사", rows: volunteer! }, { kind: "adoption", label: "입양 상담", rows: adoption! }].map(group => <div key={group.kind} data-visit-card={group.kind} className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-sm font-semibold">{group.label}</h3><p className="text-xs text-muted-foreground">신청 {group.rows.length}건{group.kind === "volunteer" && <> / {group.rows.some(event => event.people === null) ? "인원 확인 필요" : `인원 ${group.rows.reduce((sum, event) => sum + (event.people ?? 0), 0)}명`}</>}</p></div>
          {group.rows.length === 0 ? <p className="py-4 text-sm text-muted-foreground">오늘 예정된 {group.label} 일정이 없습니다.</p> : <ul className="divide-y divide-border/60">{group.rows.map(event => <li key={event.id}><Link href={`/admin/applications/${event.kind}/${event.source_application_id}`} className="grid min-h-14 grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-2 py-3 text-sm transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring"><time className="text-xs tabular-nums" dateTime={event.starts_at}>{event.all_day ? "종일" : formatTimeKst(event.starts_at)}</time><span className="min-w-0 break-words font-medium [overflow-wrap:anywhere]">{getEventTitle(event)}</span>{event.kind === "volunteer" && <span className="text-xs text-muted-foreground">{event.people === null ? "인원 확인" : `${event.people}명`}</span>}</Link></li>)}</ul>}
        </div>)}
      </div>}
    </section>
    <section aria-labelledby="dashboard-calendar"><div className="mb-3 flex items-center justify-between gap-3"><h2 id="dashboard-calendar" className="text-base font-semibold">월간 일정</h2><Link href="/admin/calendar" className="inline-flex min-h-11 items-center text-xs text-primary hover:underline">전체 캘린더</Link></div>
      <div className="rounded-xl border border-border bg-card p-3 sm:p-5"><MonthNav yearMonth={yearMonth} basePath="/admin" />
        {conflictResult.error ? <p role="alert" className="mb-3 text-sm text-destructive">신청 제한일과 겹치는 일정을 확인하지 못했습니다.</p> : conflicts.length > 0 && <Link href={`/admin/calendar?ym=${yearMonth}`} className="mb-3 flex min-h-11 items-center rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">휴무·행사와 겹치는 확정 일정 {conflicts.length}건 확인</Link>}
        {events === null ? <p role="alert" className="py-6 text-sm text-destructive">일정을 불러오지 못했습니다. 새로고침해 주세요.</p> : <MonthGrid key={`${yearMonth}-${selectedDate}`} yearMonth={yearMonth} events={events} hrefBase="/admin/calendar" addHrefBase="/admin/calendar/new" returnPath="/admin" initialSelectedDate={selectedDate} />}
      </div>
    </section>
    <DashboardStatistics stats={stats} approvedPeople={approvedPeople} />
  </div>
}
