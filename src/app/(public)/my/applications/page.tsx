import { redirect } from "next/navigation"
import Link from "next/link"
import { ChevronDown } from "lucide-react"

import { CancelMyApplicationButton } from "./cancel-button"
import { createClient } from "@/shared/lib/supabase/server"
import { Badge } from "@/shared/components/ui/badge"
import { cn } from "@/shared/lib/utils"
import { listStaffOnDates } from "@/features/staff-schedule"
import { StaffAvailabilityDisplay } from "@/features/staff-schedule"
import type { ApplicationStatus } from "@/shared/types/database"

export const dynamic = "force-dynamic"

function statusBadgeClass(status: ApplicationStatus) {
  switch (status) {
    case "접수":
      return "bg-primary/20 text-primary"
    case "검토중":
      return "bg-amber-500/20 text-amber-700 animate-amber-pulse"
    case "승인":
      return "bg-emerald-600/20 text-emerald-700"
    case "반려":
      return "bg-muted text-muted-foreground"
    case "취소":
      return "bg-muted text-muted-foreground/60"
    case "일정변경요청":
      return "bg-blue-500/20 text-blue-700 dark:text-blue-400"
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

/** 봉사 날짜 요약 표시: "05/20 (화)" 또는 "05/20 외 2일" */
function volunteerDateLabel(dates: string[], days: string[]): string {
  if (dates.length > 0) {
    const first = dates[0]
    const wd = ["일", "월", "화", "수", "목", "금", "토"][new Date(first).getDay()]
    const label = `${first.slice(5).replace("-", "/")} (${wd})`
    return dates.length > 1 ? `${label} 외 ${dates.length - 1}일` : label
  }
  if (days.length > 0) return `${days.join(", ")}요일`
  return "봉사 신청"
}

export default async function MyApplicationsPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect("/login")

  const { createAdminClient } = await import("@/shared/lib/supabase/admin")
  const admin = createAdminClient()

  const [adoptionRes, volunteerRes] = await Promise.all([
    admin
      .from("adoption_applications")
      .select("id, status, submitted_at, admin_note, cancel_reason, dog:dogs(name), cat:cats(name)")
      .eq("created_by", session.user.id)
      .order("submitted_at", { ascending: false }),
    admin
      .from("volunteer_applications")
      .select("id, status, submitted_at, admin_note, cancel_reason, available_days, available_dates, activities, reschedule_dates, reschedule_time")
      .eq("created_by", session.user.id)
      .order("submitted_at", { ascending: false }),
  ])

  const adoptions = (adoptionRes.data ?? []) as Array<{
    id: string
    status: ApplicationStatus
    submitted_at: string
    admin_note: string | null
    cancel_reason: string | null
    dog: { name: string }[] | null
    cat: { name: string }[] | null
  }>

  const volunteers = (volunteerRes.data ?? []) as Array<{
    id: string
    status: ApplicationStatus
    submitted_at: string
    admin_note: string | null
    cancel_reason: string | null
    available_days: string[]
    available_dates: string[]
    activities: string[]
    reschedule_dates: string[] | null
    reschedule_time: string | null
  }>

  const activeVolunteers = volunteers.filter((v) => v.status !== "취소")
  const cancelledVolunteers = volunteers.filter((v) => v.status === "취소")
  const activeAdoptions = adoptions.filter((a) => a.status !== "취소")
  const cancelledAdoptions = adoptions.filter((a) => a.status === "취소")

  const hasAny = volunteers.length > 0 || adoptions.length > 0

  const allDates = Array.from(new Set(volunteers.flatMap((v) => v.available_dates ?? [])))
  const staffByDate = allDates.length > 0 ? await listStaffOnDates(allDates) : {}

  const approvedVolunteerIds = volunteers
    .filter((v) => v.status === "승인")
    .map((v) => v.id)
  const certificationByAppId: Record<string, string> = {}
  if (approvedVolunteerIds.length > 0) {
    const { data: certs } = await admin
      .from("daily_posts")
      .select("id, related_volunteer_application_id")
      .eq("created_by", session.user.id)
      .eq("category", "봉사 후기")
      .in("related_volunteer_application_id", approvedVolunteerIds)
    for (const c of (certs ?? []) as { id: string; related_volunteer_application_id: string }[]) {
      certificationByAppId[c.related_volunteer_application_id] = c.id
    }
  }

  const today = new Date().toISOString().slice(0, 10)

  function hasPastVolunteerDate(dates: string[]): boolean {
    return dates.some((d) => d <= today)
  }
  /** 모든 날짜가 오늘 이전 → 일정변경 불가 */
  function allDatesPast(dates: string[]): boolean {
    return dates.length > 0 && dates.every((d) => d < today)
  }

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
            <Link href="/adopt" className="text-sm font-medium text-primary hover:underline">
              입양 신청 →
            </Link>
            <Link href="/volunteer" className="text-sm font-medium text-primary hover:underline">
              봉사 신청 →
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* ── 봉사 신청 ───────────────────────────────────── */}
          {activeVolunteers.length > 0 && (
            <section>
              <h2 className="mb-3 text-base font-semibold text-foreground">봉사 신청</h2>
              <div className="space-y-2">
                {activeVolunteers.map((v) => {
                  const isPast = allDatesPast(v.available_dates)
                  const hasCert = !!certificationByAppId[v.id]
                  const showCertBtn = v.status === "승인" && hasPastVolunteerDate(v.available_dates)
                  const canRequestEdit = v.status !== "반려" && v.status !== "취소" && !isPast
                  const isRescheduleMode = v.status === "승인" || v.status === "일정변경요청"
                  const editBtnLabel = isRescheduleMode ? "일정변경 요청" : "일정 변경"

                  return (
                    <details key={v.id} className="group overflow-hidden rounded-lg border border-border bg-card">
                      {/* ── 요약 행: 날짜 + 상태 ── */}
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 hover:bg-secondary/30 [&::-webkit-details-marker]:hidden">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {volunteerDateLabel(v.available_dates, v.available_days)} 봉사
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatDate(v.submitted_at)} 신청
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge className={cn("border-0 font-semibold", statusBadgeClass(v.status))}>
                            {v.status}
                          </Badge>
                          <ChevronDown className="size-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                        </div>
                      </summary>

                      {/* ── 펼쳐지는 상세 ── */}
                      <div className="border-t border-border/60 px-5 pb-4 pt-3 space-y-3">
                        {/* 운영진 메모 */}
                        {v.admin_note && (
                          <div className="rounded-md bg-secondary/50 px-3 py-2 text-xs text-foreground">
                            <span className="font-semibold text-muted-foreground">운영진 메모</span>
                            <p className="mt-1.5 whitespace-pre-line leading-relaxed">{v.admin_note}</p>
                          </div>
                        )}

                        {/* 날짜별 출근 예정 운영진 */}
                        {v.available_dates.length > 0 && (
                          <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2.5">
                            <p className="text-xs font-semibold text-foreground">📌 봉사일 운영진 출근 예정</p>
                            <div className="mt-2 space-y-2">
                              {v.available_dates.map((date) => {
                                const list = staffByDate[date] ?? []
                                const wd = ["일", "월", "화", "수", "목", "금", "토"][new Date(date).getDay()]
                                return (
                                  <div key={date}>
                                    <p className="text-xs font-medium text-foreground">
                                      {date.slice(5).replace("-", "/")} ({wd})
                                    </p>
                                    <div className="mt-0.5 pl-2">
                                      <StaffAvailabilityDisplay items={list} showNote />
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* ── 버튼 행 ── */}
                        <div className="flex items-center gap-2 border-t border-border/60 pt-3">
                          {/* 인증글 버튼 (왼쪽) */}
                          <div className="flex-1">
                            {showCertBtn && (
                              hasCert ? (
                                <Link
                                  href={`/daily/${certificationByAppId[v.id]}`}
                                  className="inline-flex items-center gap-1.5 rounded-md border border-pink-200 bg-pink-50 px-3 py-1.5 text-xs font-semibold text-pink-700 hover:bg-pink-100 dark:border-pink-900/40 dark:bg-pink-900/20 dark:text-pink-300"
                                >
                                  ✓ 봉사 후기 보기
                                </Link>
                              ) : (
                                <Link
                                  href={`/daily/new?application=${v.id}`}
                                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                                >
                                  ✍️ 인증글 작성
                                </Link>
                              )
                            )}
                          </div>

                          {/* 일정 변경 / 일정변경 요청 */}
                          {v.status === "일정변경요청" ? (
                            <span className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-500 cursor-not-allowed dark:border-blue-800/40 dark:bg-blue-950/20 dark:text-blue-400">
                              변경 검토 중
                            </span>
                          ) : canRequestEdit ? (
                            <Link
                              href={`/my/applications/volunteer/${v.id}/edit`}
                              className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
                            >
                              {editBtnLabel}
                            </Link>
                          ) : v.status !== "반려" && v.status !== "취소" ? (
                            <span className="rounded-md border border-border/50 bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground/40 cursor-not-allowed">
                              {editBtnLabel}
                            </span>
                          ) : null}

                          {/* 신청 취소 */}
                          <CancelMyApplicationButton
                            id={v.id}
                            kind="volunteer"
                            triggerClassName="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-destructive/40 hover:text-destructive"
                          />
                        </div>
                      </div>
                    </details>
                  )
                })}
              </div>
            </section>
          )}

          {/* ── 입양 신청 ───────────────────────────────────── */}
          {activeAdoptions.length > 0 && (
            <section>
              <h2 className="mb-3 text-base font-semibold text-foreground">입양 신청</h2>
              <div className="space-y-2">
                {activeAdoptions.map((a) => {
                  const animalName = a.dog?.[0]?.name ?? a.cat?.[0]?.name
                  return (
                    <details key={a.id} className="group overflow-hidden rounded-lg border border-border bg-card">
                      {/* ── 요약 행: 신청 항목 + 상태 ── */}
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 hover:bg-secondary/30 [&::-webkit-details-marker]:hidden">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {animalName ? `${animalName} 입양 신청` : "입양 신청"}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatDate(a.submitted_at)} 신청
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge className={cn("border-0 font-semibold", statusBadgeClass(a.status))}>
                            {a.status}
                          </Badge>
                          <ChevronDown className="size-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                        </div>
                      </summary>

                      {/* ── 펼쳐지는 상세 ── */}
                      <div className="border-t border-border/60 px-5 pb-4 pt-3 space-y-3">
                        {a.admin_note && (
                          <div className="rounded-md bg-secondary/50 px-3 py-2 text-xs text-foreground">
                            <span className="font-semibold text-muted-foreground">운영진 메모 · </span>
                            {a.admin_note}
                          </div>
                        )}

                        {/* ── 버튼 행 ── */}
                        <div className="flex items-center justify-end border-t border-border/60 pt-3">
                          <CancelMyApplicationButton
                            id={a.id}
                            kind="adoption"
                            triggerClassName="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-destructive/40 hover:text-destructive"
                          />
                        </div>
                      </div>
                    </details>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ── 취소된 신청 내역 ────────────────────────────────── */}
      {(cancelledVolunteers.length > 0 || cancelledAdoptions.length > 0) && (
        <div className="mt-10 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground">취소된 신청</h2>
          <div className="space-y-2 opacity-70">
            {[
              ...cancelledVolunteers.map((v) => ({ ...v, kind: "volunteer" as const })),
              ...cancelledAdoptions.map((a) => ({ ...a, kind: "adoption" as const })),
            ]
              .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))
              .map((item) => {
                const title = item.kind === "volunteer"
                  ? `${volunteerDateLabel((item as typeof cancelledVolunteers[0]).available_dates, (item as typeof cancelledVolunteers[0]).available_days)} 봉사`
                  : (() => {
                      const a = item as typeof cancelledAdoptions[0]
                      const name = a.dog?.[0]?.name ?? a.cat?.[0]?.name
                      return name ? `${name} 입양 신청` : "입양 신청"
                    })()

                return (
                  <details key={item.id} className="group overflow-hidden rounded-lg border border-border bg-card">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 hover:bg-secondary/30 [&::-webkit-details-marker]:hidden">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-muted-foreground">{title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground/60">
                          {formatDate(item.submitted_at)} 신청
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge className="border-0 bg-muted text-[11px] font-semibold text-muted-foreground/60">
                          취소
                        </Badge>
                        <ChevronDown className="size-4 text-muted-foreground/40 transition-transform duration-200 group-open:rotate-180" />
                      </div>
                    </summary>
                    <div className="border-t border-border/60 px-5 pb-4 pt-3 space-y-2.5">
                      {/* 직접 취소 */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          직접 취소
                        </span>
                        <span>신청자가 직접 취소한 신청입니다.</span>
                      </div>
                      {/* 취소사유 */}
                      {item.cancel_reason && (
                        <div className="rounded-md bg-secondary/40 px-3 py-2.5 text-xs text-muted-foreground">
                          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70">취소사유</p>
                          <p className="whitespace-pre-line leading-relaxed">{item.cancel_reason}</p>
                        </div>
                      )}
                    </div>
                  </details>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
