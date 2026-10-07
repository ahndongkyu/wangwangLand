import { redirect } from "next/navigation"
import Link from "next/link"
import { applicationDate } from "@/features/applications/lib/admin-list"
import { volunteerToday } from "@/features/applications/lib/volunteer-operating-hours"
import { ChevronDown } from "lucide-react"

import { CancelMyApplicationButton } from "./cancel-button"
import { createClient } from "@/shared/lib/supabase/server"
import { Badge } from "@/shared/components/ui/badge"
import { cn } from "@/shared/lib/utils"
import { listStaffOnDates } from "@/features/staff-schedule"
import { StaffAvailabilityDisplay } from "@/features/staff-schedule"
import type { ApplicationStatus } from "@/shared/types/database"

export const dynamic = "force-dynamic"

type AnimalRelation = { name: string } | { name: string }[] | null
function relatedAnimalName(animal: AnimalRelation) {
  return Array.isArray(animal) ? animal[0]?.name : animal?.name
}

function statusBadgeClass(status: ApplicationStatus) {
  switch (status) {
    case "접수":
      return "bg-primary/20 text-primary"
    case "검토중":
      return "bg-amber-500/20 text-amber-800 dark:text-amber-300"
    case "승인":
      return "bg-emerald-600/20 text-emerald-800 dark:text-emerald-300"
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

export default async function MyApplicationsPage({ searchParams }: { searchParams: Promise<{ application?: string }> }) {
  const selectedApplication = (await searchParams).application
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
      .select("id, status, submitted_at, admin_note, cancel_reason, preferred_animal, dog:dogs(name), cat:cats(name)")
      .eq("created_by", session.user.id)
      .order("submitted_at", { ascending: false }),
    admin
      .from("volunteer_applications")
      .select("id, status, submitted_at, admin_note, cancel_reason, available_days, available_dates, available_time, party_size, reschedule_dates, reschedule_time")
      .eq("created_by", session.user.id)
      .order("submitted_at", { ascending: false }),
  ])

  const adoptions = (adoptionRes.data ?? []) as Array<{
    id: string
    status: ApplicationStatus
    submitted_at: string
    admin_note: string | null
    cancel_reason: string | null
    dog: AnimalRelation
    preferred_animal: string | null
    cat: AnimalRelation
  }>

  const volunteers = (volunteerRes.data ?? []) as Array<{
    id: string
    status: ApplicationStatus
    submitted_at: string
    admin_note: string | null
    cancel_reason: string | null
    available_days: string[]
    available_dates: string[]
    available_time: string | null
    party_size: number
    reschedule_dates: string[] | null
    reschedule_time: string | null
  }>

  const activeVolunteers = volunteers.filter((v) => v.status !== "취소")
  const cancelledVolunteers = volunteers.filter((v) => v.status === "취소")
  const activeAdoptions = adoptions.filter((a) => a.status !== "취소")
  const cancelledAdoptions = adoptions.filter((a) => a.status === "취소")

  const hasAny = volunteers.length > 0 || adoptions.length > 0

  const ids = volunteers.map(v => v.id)
  const eventRes = ids.length ? await admin.from("events").select("source_application_id, starts_at").eq("source_application_type", "volunteer").in("source_application_id", ids).order("starts_at", { ascending: true }) : { data: [], error: null }
  const schedules: Record<string, string[]> = {}
  for (const event of eventRes.data ?? []) {
    if (event.source_application_id) (schedules[event.source_application_id] ??= []).push(event.starts_at)
  }
  function visitDates(v: typeof volunteers[number]) {
    if (schedules[v.id]?.length) return schedules[v.id].map(iso => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" }))
    return ["접수", "검토중"].includes(v.status) ? v.available_dates : []
  }
  const allDates = Array.from(new Set(volunteers.flatMap(visitDates)))
  const staffByDate = allDates.length > 0 ? await listStaffOnDates(allDates) : {}

  const today = volunteerToday()

  /** 모든 날짜가 오늘 이전 → 일정변경 불가 */
  function allDatesPast(dates: string[]): boolean {
    return dates.length > 0 && dates.every((d) => d < today)
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 md:py-12">
      <header className="mb-8">
        <Link href="/my" className="mb-3 inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-primary">← 마이페이지</Link>
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">나의 신청 내역</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          확정 일정과 준비 안내를 확인하고, 필요한 경우 변경을 요청하세요.
        </p>
      </header>
      {(adoptionRes.error || volunteerRes.error || eventRes.error) && <p role="alert" className="mb-5 rounded-lg border border-destructive/30 p-4 text-sm text-destructive">일부 신청 또는 확정 일정을 불러오지 못했습니다. 새로고침 후 다시 확인해주세요.</p>}

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
                  const confirmed = schedules[v.id] ?? []
                  const isPast = allDatesPast(visitDates(v))
                  const canRequestEdit = v.status !== "반려" && v.status !== "취소" && !isPast && !eventRes.error
                  const isRescheduleMode = v.status === "승인" || v.status === "일정변경요청"
                  const editBtnLabel = isRescheduleMode ? "일정변경 요청" : "일정 변경"

                  return (
                    <details key={v.id} id={`volunteer-${v.id}`} open={selectedApplication === v.id} className="group scroll-mt-24 overflow-hidden rounded-xl border border-border bg-card">
                      {/* ── 요약 행: 날짜 + 상태 ── */}
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 hover:bg-secondary/30 [&::-webkit-details-marker]:hidden">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {confirmed.length ? `${applicationDate(confirmed[0], true)}${confirmed.length > 1 ? ` 외 ${confirmed.length - 1}건` : ""}` : ["접수", "검토중"].includes(v.status) ? `${volunteerDateLabel(v.available_dates, v.available_days)} · ${v.available_time || "시간 미입력"}` : "확정 일정 없음"}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {confirmed.length ? "확정 일정" : "신청"} · {v.party_size}명 · 신청 {applicationDate(v.submitted_at, true)}
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
                        <section className="rounded-lg bg-muted/40 p-4">
                          <h3 className="text-sm font-semibold">{confirmed.length ? "확정 봉사 일정" : "일정 안내"}</h3>
                          {confirmed.length ? <ul className="mt-3 space-y-2 text-sm">{confirmed.map(iso => <li key={iso}>{applicationDate(iso, true)}</li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">{eventRes.error ? "확정 일정을 불러오지 못했습니다." : v.status === "승인" ? "방문 전 운영진에게 확정 일정을 확인해주세요." : ["접수", "검토중"].includes(v.status) ? "운영진 확인 후 일정이 확정됩니다." : "등록된 확정 일정이 없습니다."}</p>}
                        </section>
                        {v.status === "일정변경요청" && <section className="rounded-lg border border-border p-4"><h3 className="text-sm font-semibold">일정변경 검토 중</h3><p className="mt-2 text-sm">{v.reschedule_dates?.map(date => applicationDate(date)).join(", ")} · {v.reschedule_time}</p><p className="mt-2 text-xs text-muted-foreground">승인 전까지 기존 확정 일정이 유지됩니다.</p></section>}
                        {/* 운영진 메모 */}
                        {v.admin_note && (
                          <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm text-foreground">
                            <span className="font-semibold text-foreground">준비물 · 운영진 안내</span>
                            <p className="mt-1.5 whitespace-pre-line leading-relaxed">{v.admin_note}</p>
                          </div>
                        )}

                        {/* 날짜별 출근 예정 운영진 */}
                        {visitDates(v).length > 0 && (
                          <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2.5">
                            <p className="text-xs font-semibold text-foreground">봉사일 운영진 출근 예정</p>
                            <div className="mt-2 space-y-2">
                              {visitDates(v).map((date) => {
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
                        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                          {/* 일정 변경 / 일정변경 요청 */}
                          {v.status === "일정변경요청" ? (
                            <span className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-500 cursor-not-allowed dark:border-blue-800/40 dark:bg-blue-950/20 dark:text-blue-400">
                              변경 검토 중
                            </span>
                          ) : canRequestEdit ? (
                            <Link
                              href={`/my/applications/volunteer/${v.id}/edit`}
                              className="inline-flex min-h-11 items-center rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
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
                            triggerClassName="inline-flex min-h-11 items-center rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-muted-foreground hover:border-destructive/40 hover:text-destructive"
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
                  const animalName = relatedAnimalName(a.dog) ?? relatedAnimalName(a.cat) ?? a.preferred_animal
                  return (
                    <details key={a.id} className="group overflow-hidden rounded-xl border border-border bg-card">
                      {/* ── 요약 행: 신청 항목 + 상태 ── */}
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 hover:bg-secondary/30 [&::-webkit-details-marker]:hidden">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-medium text-foreground">
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
                            triggerClassName="inline-flex min-h-11 items-center rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-muted-foreground hover:border-destructive/40 hover:text-destructive"
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
                      const name = relatedAnimalName(a.dog) ?? relatedAnimalName(a.cat) ?? a.preferred_animal
                      return name ? `${name} 입양 신청` : "입양 신청"
                    })()

                return (
                  <details key={item.id} className="group overflow-hidden rounded-xl border border-border bg-card">
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
                          취소
                        </span>
                        <span>취소된 신청입니다.</span>
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
