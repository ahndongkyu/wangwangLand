import Link from "next/link"

import { countCatsByStatus } from "@/features/cats"
import { countDogsByStatus } from "@/features/dogs"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { createClient } from "@/shared/lib/supabase/server"

export const dynamic = "force-dynamic"

async function getApplicationCounts() {
  const supabase = await createClient()

  const [{ count: adoptionCount }, { count: volunteerCount }] = await Promise.all([
    supabase
      .from("adoption_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "접수"),
    supabase
      .from("volunteer_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "접수"),
  ])

  return {
    adoption: adoptionCount ?? 0,
    volunteer: volunteerCount ?? 0,
  }
}

export default async function AdminDashboardPage() {
  const [dogCounts, catCounts, appCounts] = await Promise.all([
    countDogsByStatus(),
    countCatsByStatus(),
    getApplicationCounts(),
  ])

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          대시보드
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          왕왕랜드 운영 현황 한눈에 보기
        </p>
      </header>

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

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          📋 처리 대기중인 신청
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/admin/applications?type=adoption" className="block">
            <StatCard label="입양 신청" value={appCounts.adoption} highlight />
          </Link>
          <Link href="/admin/applications?type=volunteer" className="block">
            <StatCard label="봉사 신청" value={appCounts.volunteer} highlight />
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          ⚡ 빠른 작업
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <QuickLink href="/admin/dogs/new" label="강아지 등록" />
          <QuickLink href="/admin/cats/new" label="고양이 등록" />
          <QuickLink href="/admin/notices" label="공지 작성" />
          <QuickLink href="/admin/daily" label="일상 사진" />
        </div>
      </section>
    </div>
  )
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string
  value: number
  highlight?: boolean
}) {
  return (
    <Card className={highlight && value > 0 ? "border-primary" : ""}>
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
