import Link from "next/link"
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  Clock,
  Inbox,
  PenSquare,
} from "lucide-react"

import {
  countPendingApplications,
  getApplicationStats,
  listRecentApplications,
  getMonthlyVolunteerStats,
} from "@/features/applications"
import { listNotices } from "@/features/notices"
import { listDailyPosts } from "@/features/daily"
import { listAdoptionStories } from "@/features/stories"
import { listUpcomingEvents } from "@/features/events"
import { formatKoreanDayLabel } from "@/features/events/lib/date"
import {
  CATEGORY_COLOR,
  CATEGORY_LABEL,
  customColorStyle,
  eventDisplayLabel,
} from "@/features/events"
import { AdminTrendChart } from "@/shared/components/admin-trend-chart"
import { BrandIcon } from "@/shared/components/brand-icon"
import { Badge } from "@/shared/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { cn } from "@/shared/lib/utils"
import type { ApplicationStatus } from "@/shared/types/database"

export const dynamic = "force-dynamic"

function monthRange(d: Date) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1)
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  const fmt = (x: Date) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(
      x.getDate()
    ).padStart(2, "0")}`
  return { from: fmt(start), to: fmt(end) }
}

function statusBadgeColor(status: ApplicationStatus) {
  switch (status) {
    case "접수":
      return "bg-primary/20 text-primary"
    case "검토중":
      return "bg-amber-500/20 text-amber-700"
    case "승인":
      return "bg-emerald-600/20 text-emerald-700"
    case "반려":
      return "bg-muted text-muted-foreground"
  }
}

function deltaBadge(current: number, prev: number) {
  if (prev === 0 && current === 0) return null
  if (prev === 0) {
    return (
      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
        신규
      </span>
    )
  }
  const diff = current - prev
  const pct = Math.round((diff / prev) * 100)
  const up = diff >= 0
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
        up
          ? "bg-emerald-500/15 text-emerald-700"
          : "bg-rose-500/15 text-rose-700"
      )}
    >
      {up ? "▲" : "▼"} {Math.abs(pct)}%
    </span>
  )
}

export default async function AdminDashboardPage() {
  const now = new Date()
  const thisMonth = monthRange(now)
  const prevMonth = monthRange(new Date(now.getFullYear(), now.getMonth() - 1, 15))

  const [
    upcomingEvents,
    pendingCounts,
    appStats,
    recentApps,
    monthlyVolunteerStats,
    noticesCount,
    dailyCount,
    storiesCount,
  ] = await Promise.all([
    // 다가오는 일정 — 운영진은 internal 까지 포함해야 하지만 앞단 admin 가드라 RLS 통과.
    // listUpcomingEvents 는 visibility=public 만 보지만, 자동 등록 이벤트도 public 이라 포함됨.
    listUpcomingEvents(8),
    countPendingApplications(),
    getApplicationStats({
      monthFrom: thisMonth.from,
      monthTo: thisMonth.to,
      prevMonthFrom: prevMonth.from,
      prevMonthTo: prevMonth.to,
    }),
    listRecentApplications(5),
    getMonthlyVolunteerStats(6),
    listNotices({ includeDrafts: true, limit: 1 }).then((r) => r.total),
    listDailyPosts({ limit: 1 }).then((r) => r.total),
    listAdoptionStories({ includeDrafts: true, limit: 1 }).then((r) => r.total),
  ])

  const monthLabel = now.toLocaleDateString("ko-KR", { month: "long" })
  const totalPending = pendingCounts.adoption + pendingCounts.volunteer

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">대시보드</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          왕왕랜드 운영 현황 ·{" "}
          {now.toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </header>

      {/* 1. 빠른 작성 — 매일 가장 자주 쓰는 4가지 */}
      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
          <PenSquare className="size-4" aria-hidden />
          빠른 작성
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <QuickLink
            href="/admin/calendar/new"
            icon="calendar"
            label="새 일정"
            desc="봉사·행사·휴무"
          />
          <QuickLink
            href="/admin/notices/new"
            icon="notification"
            label="공지 작성"
            desc="새 소식 게시"
          />
          <QuickLink
            href="/admin/daily/new"
            icon="camera"
            label="일상 작성"
            desc="활동 기록"
          />
          <QuickLink
            href="/admin/stories/new"
            icon="heart"
            label="후기 작성"
            desc="입양 후기"
          />
        </div>
      </section>

      {/* 2. 다가오는 일정 — 운영진이 매일 확인하는 핵심 */}
      <section className="mb-8">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
            <CalendarDays className="size-4" aria-hidden />
            다가오는 일정
          </h2>
          <Link
            href="/admin/calendar"
            className="text-xs font-semibold text-primary hover:underline"
          >
            캘린더 전체 보기 →
          </Link>
        </div>
        {upcomingEvents.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-10 text-center">
            <CalendarDays className="size-8 text-muted-foreground/40" aria-hidden />
            <div>
              <p className="text-sm font-medium text-foreground">
                예정된 일정이 없어요
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                <Link href="/admin/calendar/new" className="text-primary hover:underline">
                  새 일정 등록 →
                </Link>
              </p>
            </div>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-lg border border-border bg-card">
            {upcomingEvents.map((ev) => {
              const isCustom = ev.category === "custom"
              const color = CATEGORY_COLOR[ev.category]
              const customStyle = isCustom ? customColorStyle(ev.custom_color) : null
              return (
                <li key={ev.id} className="border-b border-border last:border-0">
                  <Link
                    href={`/admin/calendar/${ev.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-secondary/40"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        style={customStyle?.soft}
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                          !isCustom && color.soft,
                          !isCustom && color.softText
                        )}
                      >
                        {eventDisplayLabel(ev)}
                      </span>
                      <span className="truncate font-medium text-foreground">
                        {ev.title}
                      </span>
                      {ev.signup_enabled && ev.signup_count > 0 && (
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          신청 {ev.signup_count}
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatKoreanDayLabel(ev.starts_at, ev.all_day)}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* 3. 처리 대기 + 최근 신청 — 운영진이 즉시 액션해야 하는 항목 */}
      <section className="mb-8 grid gap-4 md:grid-cols-2">
        <Card
          className={cn(
            totalPending > 0 && "border-primary animate-pending-glow"
          )}
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Inbox className="size-4 text-muted-foreground" aria-hidden />
              처리 대기 신청
              {totalPending > 0 && (
                <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                  {totalPending}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Link
              href="/admin/applications?type=volunteer&status=접수"
              className="flex flex-col rounded-md border border-border bg-background p-3 transition-colors hover:border-primary/50"
            >
              <span className="text-[11px] text-muted-foreground">봉사</span>
              <span className="mt-0.5 text-lg font-bold text-foreground">
                {pendingCounts.volunteer}
              </span>
            </Link>
            <Link
              href="/admin/applications?type=adoption&status=접수"
              className="flex flex-col rounded-md border border-border bg-background p-3 transition-colors hover:border-primary/50"
            >
              <span className="text-[11px] text-muted-foreground">입양</span>
              <span className="mt-0.5 text-lg font-bold text-foreground">
                {pendingCounts.adoption}
              </span>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Clock className="size-4 text-muted-foreground" aria-hidden />
              최근 신청
              <Link
                href="/admin/applications"
                className="ml-auto text-xs font-normal text-primary hover:underline"
              >
                전체 →
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {recentApps.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                최근 신청이 없습니다.
              </p>
            ) : (
              recentApps.map((app) => (
                <Link
                  key={`${app.type}-${app.id}`}
                  href={`/admin/applications/${app.type}/${app.id}`}
                  className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-secondary/40"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-foreground/70">
                      {app.type === "adoption" ? "입양" : "봉사"}
                    </span>
                    <span className="truncate text-foreground">{app.applicant_name}</span>
                    <Badge
                      className={cn(
                        "shrink-0 border-0 text-[10px] font-semibold",
                        statusBadgeColor(app.status)
                      )}
                    >
                      {app.status}
                    </Badge>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {new Date(app.submitted_at).toLocaleString("ko-KR", {
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      {/* 4. 이번 달 현황 — 통계 (작게) */}
      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
          <ClipboardList className="size-4" aria-hidden />
          {monthLabel} 현황
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MonthCard
            label="입양 신청"
            value={appStats.adoption.thisMonth}
            prev={appStats.adoption.lastMonth}
            href="/admin/applications?type=adoption"
          />
          <MonthCard
            label="봉사 신청"
            value={appStats.volunteer.thisMonth}
            prev={appStats.volunteer.lastMonth}
            href="/admin/applications?type=volunteer"
          />
          <MonthCard
            label="공지/일상/후기"
            value={noticesCount + dailyCount + storiesCount}
            extra={
              <span className="text-[10px] text-muted-foreground/70">
                ({noticesCount}/{dailyCount}/{storiesCount})
              </span>
            }
            href="/admin/notices"
          />
          <MonthCard
            label="대기 중인 신청"
            value={totalPending}
            href="/admin/applications?status=접수"
            highlight
            suffix="건"
          />
        </div>
      </section>

      {/* 5. 봉사 신청 추이 차트 (선택) */}
      <section className="mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <BarChart3 className="size-4 text-muted-foreground" aria-hidden />
              월별 봉사 신청 추이 (최근 6개월)
              <Link
                href="/admin/applications?type=volunteer"
                className="ml-auto text-xs font-normal text-primary hover:underline"
              >
                봉사 신청 목록 →
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AdminTrendChart data={monthlyVolunteerStats} valueLabel="건" />
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function MonthCard({
  label,
  value,
  prev,
  suffix,
  extra,
  href,
  highlight,
}: {
  label: string
  value: number
  prev?: number
  suffix?: string
  extra?: React.ReactNode
  href?: string
  highlight?: boolean
}) {
  const card = (
    <Card
      className={cn(
        "h-full transition-colors",
        href && "hover:border-primary/50",
        highlight && value > 0 && "border-primary"
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>{label}</span>
          {prev !== undefined && deltaBadge(value, prev)}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-baseline gap-1.5">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {suffix && <p className="text-xs text-muted-foreground">{suffix}</p>}
        {extra}
        {prev !== undefined && (
          <p className="text-[10px] text-muted-foreground/70">전월 {prev}건</p>
        )}
      </CardContent>
    </Card>
  )
  return href ? (
    <Link href={href} className="block">
      {card}
    </Link>
  ) : (
    card
  )
}

function QuickLink({
  href,
  icon,
  label,
  desc,
  highlight,
}: {
  href: string
  icon: Parameters<typeof BrandIcon>[0]["name"]
  label: string
  desc: string
  highlight?: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col items-start gap-2 rounded-lg border bg-card p-4 transition-colors",
        highlight
          ? "border-primary/40 bg-primary/5 hover:bg-primary/10"
          : "border-border hover:border-primary/40 hover:bg-secondary"
      )}
    >
      <span
        className={cn(
          "flex size-9 items-center justify-center rounded-lg transition-colors",
          highlight
            ? "bg-primary/20 group-hover:bg-primary/30"
            : "bg-primary/10 group-hover:bg-primary/20"
        )}
      >
        <BrandIcon name={icon} size={20} decorative />
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </Link>
  )
}
