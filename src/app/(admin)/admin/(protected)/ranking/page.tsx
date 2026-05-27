import type { Metadata } from "next"
import { BarChart2, CalendarDays, Trophy, Users } from "lucide-react"

import { getCurrentProfile } from "@/features/members"
import { getVolunteerRanking } from "@/features/volunteer-tier"

import { AdminRankingTable } from "./_components/ranking-table"

export const metadata: Metadata = { title: "봉사 랭킹" }
export const dynamic = "force-dynamic"

export default async function AdminRankingPage() {
  const [profile, ranking] = await Promise.all([
    getCurrentProfile(),
    getVolunteerRanking(),
  ])

  const totalCount = ranking.reduce((s, r) => s + r.count, 0)
  const activeCount = ranking.length
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const thisMonthCount = ranking.filter((r) => {
    // 이번 달 봉사 1회 이상인 회원 수 (근사치 — 정확히 보려면 별도 쿼리 필요)
    return r.count > 0
  }).length

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">

      {/* 헤더 */}
      <div className="mb-6 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <BarChart2 className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-foreground">봉사 랭킹</h1>
          <p className="text-xs text-muted-foreground">전체 회원 봉사 현황 · 이름 전체 표시</p>
        </div>
      </div>

      {/* 요약 */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <SummaryCard icon={<Users className="size-4" />} label="봉사 참여 회원" value={`${activeCount}명`} />
        <SummaryCard icon={<Trophy className="size-4" />} label="총 봉사 횟수" value={`${totalCount}회`} />
        <SummaryCard icon={<CalendarDays className="size-4" />} label="1위" value={ranking[0]?.nickname ?? "-"} />
      </div>

      {/* 랭킹 테이블 */}
      <AdminRankingTable ranking={ranking} myId={profile?.id} />
    </div>
  )
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  )
}
