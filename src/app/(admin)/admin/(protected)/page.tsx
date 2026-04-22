import Link from "next/link"

import {
  getApplicationStats,
  listRecentApplications,
} from "@/features/applications"
import { countCatsByStatus } from "@/features/cats"
import { countDogsByStatus } from "@/features/dogs"
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

  const [dogCounts, catCounts, appStats, recentApps] = await Promise.all([
    countDogsByStatus(),
    countCatsByStatus(),
    getApplicationStats({
      monthFrom: thisMonth.from,
      monthTo: thisMonth.to,
      prevMonthFrom: prevMonth.from,
      prevMonthTo: prevMonth.to,
    }),
    listRecentApplications(6),
  ])

  const dogTotal =
    dogCounts["보호중"] +
    dogCounts["임시보호중"] +
    dogCounts["입양완료"] +
    dogCounts["무지개다리"]
  const dogAdopted = dogCounts["입양완료"]
  const dogAdoptionRate =
    dogTotal > 0 ? Math.round((dogAdopted / dogTotal) * 100) : 0

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          대시보드
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          왕왕랜드 운영 현황 — 오늘 기준{" "}
          {now.toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </header>

      {/* 1. 이번 달 요약 */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          📅 이번 달 요약
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
            label="입양 완료 누적"
            value={dogAdopted}
            suffix={`/ ${dogTotal}마리`}
            extra={<span className="text-xs text-primary">{dogAdoptionRate}%</span>}
            href="/admin/dogs?status=입양완료"
          />
          <MonthCard
            label="대기중인 신청"
            value={
              appStats.adoption.allTime["접수"] +
              appStats.volunteer.allTime["접수"]
            }
            href="/admin/applications?status=접수"
            highlight
          />
        </div>
      </section>

      {/* 2. 신청 상태별 누적 */}
      <section className="mb-8 grid gap-4 md:grid-cols-2">
        <StatusBreakdown
          title="📋 입양 신청 상태 (누적)"
          counts={appStats.adoption.allTime}
          basePath="/admin/applications?type=adoption"
        />
        <StatusBreakdown
          title="🙌 봉사 신청 상태 (누적)"
          counts={appStats.volunteer.allTime}
          basePath="/admin/applications?type=volunteer"
        />
      </section>

      {/* 3. 최근 신청 */}
      <section className="mb-8">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">
            🕒 최근 신청
          </h2>
          <Link
            href="/admin/applications"
            className="text-xs font-semibold text-primary hover:underline"
          >
            전체 보기 →
          </Link>
        </div>
        {recentApps.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            아직 신청이 없습니다.
          </div>
        ) : (
          <ul className="overflow-hidden rounded-lg border border-border bg-card">
            {recentApps.map((app) => (
              <li
                key={`${app.type}-${app.id}`}
                className="border-b border-border last:border-0"
              >
                <Link
                  href={`/admin/applications/${app.type}/${app.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-secondary/40"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-foreground/70">
                      {app.type === "adoption" ? "입양" : "봉사"}
                    </span>
                    <span className="truncate font-medium text-foreground">
                      {app.applicant_name}
                    </span>
                    <Badge
                      className={cn(
                        "shrink-0 border-0 text-[10px] font-semibold",
                        statusBadgeColor(app.status)
                      )}
                    >
                      {app.status}
                    </Badge>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(app.submitted_at).toLocaleString("ko-KR", {
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 4. 동물 현황 */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          🐶 강아지 현황
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="보호중" value={dogCounts["보호중"]} />
          <StatCard label="임시보호중" value={dogCounts["임시보호중"]} />
          <StatCard label="입양완료" value={dogCounts["입양완료"]} />
          <StatCard label="무지개다리" value={dogCounts["무지개다리"]} />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          🐱 고양이 현황
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="보호중" value={catCounts["보호중"]} />
          <StatCard label="임시보호중" value={catCounts["임시보호중"]} />
          <StatCard label="입양완료" value={catCounts["입양완료"]} />
          <StatCard label="무지개다리" value={catCounts["무지개다리"]} />
        </div>
      </section>

      {/* 5. 빠른 작업 */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          ⚡ 빠른 작업
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <QuickLink href="/admin/dogs/new" label="강아지 등록" />
          <QuickLink href="/admin/cats/new" label="고양이 등록" />
          <QuickLink href="/admin/notices/new" label="공지 작성" />
          <QuickLink href="/admin/daily/new" label="일상 작성" />
        </div>
      </section>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </CardContent>
    </Card>
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
        {suffix && (
          <p className="text-xs text-muted-foreground">{suffix}</p>
        )}
        {extra}
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

function StatusBreakdown({
  title,
  counts,
  basePath,
}: {
  title: string
  counts: {
    접수: number
    검토중: number
    승인: number
    반려: number
    total: number
  }
  basePath: string
}) {
  const rows: Array<{ label: ApplicationStatus; value: number }> = [
    { label: "접수", value: counts["접수"] },
    { label: "검토중", value: counts["검토중"] },
    { label: "승인", value: counts["승인"] },
    { label: "반려", value: counts["반려"] },
  ]
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">
          {title}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            총 {counts.total}건
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {rows.map((r) => (
          <Link
            key={r.label}
            href={`${basePath}&status=${r.label}`}
            className="flex flex-col rounded-md border border-border bg-background p-3 transition-colors hover:border-primary/50"
          >
            <span className="text-[11px] text-muted-foreground">{r.label}</span>
            <span className="mt-0.5 text-lg font-bold text-foreground">
              {r.value}
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-center rounded-lg border border-border bg-card px-4 py-6 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
    >
      {label}
    </Link>
  )
}
