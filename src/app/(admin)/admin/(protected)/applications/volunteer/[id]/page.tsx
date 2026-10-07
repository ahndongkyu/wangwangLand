import Link from "next/link"
import { notFound } from "next/navigation"
import { MessageSquare, Phone } from "lucide-react"
import { ApplicationStatusForm, formatVolunteerApplicantName, getVolunteerApplication } from "@/features/applications"
import { ApplicationBadge } from "@/features/applications/components/application-detail-layout"
import { applicationDate } from "@/features/applications/lib/admin-list"
import { applicationBackLabel, volunteerDetailHref, volunteerReturnHref } from "@/features/applications/lib/detail-navigation"
import { listStaffOnDates, StaffAvailabilityDisplay } from "@/features/staff-schedule"
import { createAdminClient } from "@/shared/lib/supabase/admin"
import { formatKoreanPhone } from "@/shared/lib/validation"
import { cn } from "@/shared/lib/utils"
import { DeleteEventButton } from "@/features/events/components/delete-event-button"

export const dynamic = "force-dynamic"
const panel = "w-full min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5"

export default async function VolunteerApplicationDetailPage({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ returnTo?: string | string[]; event?: string | string[] }>
}) {
  const { id } = await params, query = await searchParams
  const returnHref = volunteerReturnHref(query.returnTo)
  const app = await getVolunteerApplication(id)
  if (!app) notFound()
  const requestedDates = app.status === "일정변경요청" ? app.reschedule_dates ?? [] : app.available_dates
  const admin = createAdminClient()
  const [{ data, error }, staffByDate] = await Promise.all([
    admin.from("events").select("id, starts_at, ends_at, location").eq("source_application_type", "volunteer").eq("source_application_id", id).order("starts_at", { ascending: true }),
    requestedDates.length ? listStaffOnDates(requestedDates) : Promise.resolve({}),
  ])
  if (error) throw new Error("등록된 일정을 불러오지 못했습니다. 새로고침해 주세요.")
  const events = data ?? []
  const selected = events.find(event => event.id === query.event)
  const isGroup = app.party_size > 1
  const detailHref = volunteerDetailHref(id, returnHref, selected?.id)
  const fresh = ["접수", "검토중"].includes(app.status) && !events.length
  const name = formatVolunteerApplicantName(app.applicant_name, app.group_name)

  return <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 [overflow-wrap:anywhere]">
    <Link href={returnHref} className="mb-5 inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground">← {applicationBackLabel(returnHref)}</Link>
    <header className="mb-6">
      <p className="mb-2 text-xs text-muted-foreground">봉사 신청 상세</p>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><h1 className="text-2xl font-bold md:text-3xl">{app.group_name || app.applicant_name}</h1><p className="mt-2 text-sm text-muted-foreground">{isGroup ? `대표 ${app.applicant_name} · 단체` : "개인"} {app.party_size}명</p></div>
        <div className="flex flex-wrap gap-2"><ApplicationBadge status={app.status} />{app.status === "승인" && !events.length && <span className="rounded-md bg-muted px-2 py-1 text-xs">일정 미등록</span>}</div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">신청일시 · {applicationDate(app.submitted_at, true)}</p>
        <div className="flex gap-2"><Contact href={`tel:${app.phone}`} icon={Phone}>전화</Contact><Contact href={`sms:${app.phone}`} icon={MessageSquare}>문자</Contact></div>
      </div>
    </header>
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
      <div className="contents xl:flex xl:min-w-0 xl:flex-[1.4] xl:flex-col xl:gap-4">
      <section className={cn(panel, "order-1")}>
        <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">{fresh ? "희망 봉사 일정" : "확정 봉사 일정"}</h2><span className="text-xs text-muted-foreground">{fresh ? app.available_dates.length : events.length}건</span></div>
        {selected && <p className="mb-3 text-xs text-primary">캘린더에서 선택한 일정</p>}
        {fresh ? <><ul className="divide-y divide-border">{app.available_dates.map(date => <li key={date} className="py-4 text-sm">{applicationDate(date)} · {app.available_time || "시간 미입력"}</li>)}</ul><p className="mt-3 text-xs text-muted-foreground">승인하면 이 날짜로 캘린더에 등록됩니다.</p></> : events.length ? <>
          <ul className="space-y-2">{events.map(event => <li key={event.id} className={cn("flex flex-wrap items-center gap-3 rounded-lg border border-border p-3", selected?.id === event.id && "bg-primary/5 border-primary/25")}>
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{applicationDate(event.starts_at, true)}</p><p className="mt-1 text-xs text-muted-foreground">{app.party_size}명{event.location ? ` · ${event.location}` : ""}</p>{selected?.id === event.id && <p className="mt-1 text-xs text-primary">현재 확인 중인 일정</p>}</div>
            <Link href={`/admin/calendar/${event.id}/edit?${new URLSearchParams({ returnTo: detailHref })}`} className="inline-flex min-h-11 shrink-0 items-center rounded-lg border border-border px-3 text-xs hover:bg-muted">일정 수정</Link>
            <DeleteEventButton id={event.id} returnHref={detailHref} />
          </li>)}</ul><p className="mt-4 text-xs text-muted-foreground">날짜별 수정은 해당 일정에만 적용됩니다.</p>
        </> : <p className="text-sm text-muted-foreground">확정된 일정이 없습니다.</p>}
        {app.status === "승인" && <Link href={`/admin/calendar/new?from=${id}`} className="mt-4 inline-flex min-h-11 items-center text-sm text-primary hover:underline">일정 추가</Link>}
      </section>
      {app.status === "일정변경요청" && <section className={cn(panel, "order-3")}><h2 className="mb-4 text-lg font-semibold">일정변경 요청</h2><div className="grid gap-4 sm:grid-cols-2"><div><h3 className="mb-2 text-xs text-muted-foreground">현재 확정 일정 · {events.length}건</h3><ul className="space-y-2 text-sm">{events.map(event => <li key={event.id}>{applicationDate(event.starts_at, true)}</li>)}</ul></div><div><h3 className="mb-2 text-xs text-muted-foreground">요청 일정 · {requestedDates.length}건</h3><ul className="space-y-2 text-sm">{requestedDates.map(date => <li key={date}>{applicationDate(date)} · {app.reschedule_time || "시간 미입력"}</li>)}</ul></div></div></section>}
      <section className={cn(panel, "order-3")}><h2 className="mb-4 text-lg font-semibold">신청정보</h2><dl className="space-y-3 text-sm">{isGroup && <Row label="단체명">{app.group_name || "미입력"}</Row>}<Row label={isGroup ? "대표자" : "신청자"}>{app.applicant_name}</Row><Row label="연락처">{formatKoreanPhone(app.phone)}</Row><Row label="신청 인원">{app.party_size}명</Row></dl>{app.message && <div className="mt-5 border-t border-border pt-4"><p className="mb-2 text-xs text-muted-foreground">신청 메모</p><p className="whitespace-pre-wrap text-sm leading-6">{app.message}</p></div>}</section>
      <details className={cn(panel, "order-3")}><summary className="min-h-11 cursor-pointer text-sm">신청 희망 일정 · 운영진 출근 정보</summary><div className="mt-3 space-y-3 text-sm">{app.available_dates.map(date => <p key={date}>{applicationDate(date)} · {app.available_time || "시간 미입력"}</p>)}{!app.available_dates.length && <p>{app.available_days.join(", ") || "희망 날짜 없음"}</p>}<p className="text-xs text-muted-foreground">실제 방문 날짜와 시간은 확정 봉사 일정을 확인해 주세요.</p>{requestedDates.map(date => <div key={date}><p className="mb-2">{applicationDate(date)}</p><StaffAvailabilityDisplay items={(staffByDate as Record<string, React.ComponentProps<typeof StaffAvailabilityDisplay>["items"]>)[date] ?? []} showNote /></div>)}</div></details>
      <details className={cn(panel, "order-3")}><summary className="min-h-11 cursor-pointer text-sm">동의 안내 · 가입 정보</summary><div className="mt-3 space-y-2 text-xs leading-6 text-muted-foreground"><p>안전 수칙 · 개인정보 수집·이용 · 이용약관</p><p>신청서에서 필수 확인한 항목입니다.</p><p>{app.created_by ? "회원 신청" : "비회원 신청"}{app.signup_provider ? ` · ${providerLabel(app.signup_provider)}` : ""}</p></div></details>
      </div>
      <aside id="application-processing" className="order-2 min-w-0 scroll-mt-20 xl:min-w-[300px] xl:flex-[.95]">
        <ApplicationStatusForm key={app.id} id={app.id} kind="volunteer" returnHref={returnHref} currentStatus={app.status} currentNote={app.admin_note} applicantName={name} partySize={app.party_size} currentCancelReason={app.cancel_reason} linkedEventCount={events.length} linkedEvents={events}
          hint={{ availableDates: requestedDates, availableTime: app.status === "일정변경요청" ? app.reschedule_time : app.available_time }}
          rescheduleInfo={app.status === "일정변경요청" ? { dates: requestedDates, time: app.reschedule_time ?? null } : undefined}
          approvalInfo={app.approved_by_profile && app.approved_at ? { nickname: app.approved_by_profile.nickname, role: app.approved_by_profile.role, approvedAt: app.approved_at } : null} />
      </aside>
    </div>
  </div>
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-3"><dt className="text-muted-foreground">{label}</dt><dd>{children}</dd></div>
}
function Contact({ href, icon: Icon, children }: { href: string; icon: typeof Phone; children: React.ReactNode }) {
  return <a href={href} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm hover:bg-muted"><Icon className="size-4" aria-hidden />{children}</a>
}
function providerLabel(provider: string) {
  return ({ kakao: "카카오", google: "구글", naver: "네이버", apple: "애플", email: "이메일" } as Record<string, string>)[provider] || "기타 가입"
}
