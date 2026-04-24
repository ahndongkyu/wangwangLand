import { redirect } from "next/navigation"
import Link from "next/link"

import { createClient } from "@/shared/lib/supabase/server"
import { Badge } from "@/shared/components/ui/badge"
import { cn } from "@/shared/lib/utils"
import type { ApplicationStatus } from "@/shared/types/database"

export const dynamic = "force-dynamic"

function statusBadgeClass(status: ApplicationStatus) {
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export default async function MyApplicationsPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect("/login")

  const [adoptionRes, volunteerRes] = await Promise.all([
    supabase
      .from("adoption_applications")
      .select("id, status, submitted_at, admin_note, dog:dogs(name), cat:cats(name)")
      .eq("created_by", session.user.id)
      .order("submitted_at", { ascending: false }),
    supabase
      .from("volunteer_applications")
      .select("id, status, submitted_at, admin_note, available_days, activities")
      .eq("created_by", session.user.id)
      .order("submitted_at", { ascending: false }),
  ])

  const adoptions = (adoptionRes.data ?? []) as Array<{
    id: string
    status: ApplicationStatus
    submitted_at: string
    admin_note: string | null
    dog: { name: string } | null
    cat: { name: string } | null
  }>

  const volunteers = (volunteerRes.data ?? []) as Array<{
    id: string
    status: ApplicationStatus
    submitted_at: string
    admin_note: string | null
    available_days: string[]
    activities: string[]
  }>

  const hasAny = adoptions.length > 0 || volunteers.length > 0

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 md:px-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">나의 신청 내역</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          입양·봉사 신청 현황을 확인하세요.
        </p>
      </header>

      {!hasAny ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          아직 신청 내역이 없습니다.
          <div className="mt-4 flex justify-center gap-3">
            <Link
              href="/adopt"
              className="text-sm font-medium text-primary hover:underline"
            >
              입양 신청 →
            </Link>
            <Link
              href="/volunteer"
              className="text-sm font-medium text-primary hover:underline"
            >
              봉사 신청 →
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* 봉사 신청 */}
          {volunteers.length > 0 && (
            <section>
              <h2 className="mb-3 text-base font-semibold text-foreground">봉사 신청</h2>
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                {volunteers.map((v, i) => (
                  <div
                    key={v.id}
                    className={cn(
                      "px-5 py-4",
                      i !== volunteers.length - 1 && "border-b border-border"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">
                          {v.available_days.length > 0
                            ? v.available_days.join(", ") + " 봉사"
                            : "봉사 신청"}
                        </p>
                        {v.activities.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {v.activities.join(", ")}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatDate(v.submitted_at)} 신청
                        </p>
                      </div>
                      <Badge
                        className={cn(
                          "shrink-0 border-0 font-semibold",
                          statusBadgeClass(v.status)
                        )}
                      >
                        {v.status}
                      </Badge>
                    </div>
                    {v.admin_note && (
                      <div className="mt-3 rounded-md bg-secondary/50 px-3 py-2 text-xs text-foreground">
                        <span className="font-semibold text-muted-foreground">운영진 메모 · </span>
                        {v.admin_note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 입양 신청 */}
          {adoptions.length > 0 && (
            <section>
              <h2 className="mb-3 text-base font-semibold text-foreground">입양 신청</h2>
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                {adoptions.map((a, i) => (
                  <div
                    key={a.id}
                    className={cn(
                      "px-5 py-4",
                      i !== adoptions.length - 1 && "border-b border-border"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">
                          {a.dog?.name ?? a.cat?.name
                            ? `${a.dog?.name ?? a.cat?.name} 입양 신청`
                            : "입양 신청"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(a.submitted_at)} 신청
                        </p>
                      </div>
                      <Badge
                        className={cn(
                          "shrink-0 border-0 font-semibold",
                          statusBadgeClass(a.status)
                        )}
                      >
                        {a.status}
                      </Badge>
                    </div>
                    {a.admin_note && (
                      <div className="mt-3 rounded-md bg-secondary/50 px-3 py-2 text-xs text-foreground">
                        <span className="font-semibold text-muted-foreground">운영진 메모 · </span>
                        {a.admin_note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
