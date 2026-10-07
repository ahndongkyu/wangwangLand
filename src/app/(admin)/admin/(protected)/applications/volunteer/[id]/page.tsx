import Link from "next/link"
import { ApplicationBadge } from "@/features/applications/components/application-detail-layout"
import { applicationDate, applicationReturnHref } from "@/features/applications/lib/admin-list"
import { notFound } from "next/navigation"
import { KeyRound, MessageSquare, Phone, Users } from "lucide-react"

import {
  ApplicationStatusForm,
  formatVolunteerApplicantName,
  getVolunteerApplication,
} from "@/features/applications"
import { getEventTitle } from "@/features/events"
import { listStaffOnDates, StaffAvailabilityDisplay } from "@/features/staff-schedule"
import { formatKoreanPhone } from "@/shared/lib/validation"

export const dynamic = "force-dynamic"

function providerLabel(provider: string | null): string {
  switch (provider) {
    case "kakao":
      return "카카오"
    case "google":
      return "구글"
    case "naver":
      return "네이버"
    case "apple":
      return "애플"
    case "email":
      return "이메일"
    default:
      return "—"
  }
}

export default async function VolunteerApplicationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}) {
  const { id } = await params
  const returnHref = applicationReturnHref((await searchParams).returnTo, "volunteer")
  const app = await getVolunteerApplication(id)

  if (!app) notFound()

  // 봉사 신청 날짜에 출근 예정 운영진 조회
  const requestedDates = app.status === "일정변경요청" ? app.reschedule_dates ?? [] : app.available_dates
  const staffByDate = requestedDates.length > 0
    ? await listStaffOnDates(requestedDates)
    : {}

  // 연결된 전체 일정을 읽어 변경 요청 비교와 중복 등록 안내에 사용합니다.
  let linkedEvents: Array<{
    id: string
    title: string
    starts_at: string
    ends_at: string
    source_application_id: string | null
  }> = []
  {
    const { createAdminClient } = await import("@/shared/lib/supabase/admin")
    const admin = createAdminClient()
    const { data, error } = await admin
      .from("events")
      .select("id, title, starts_at, ends_at, source_application_id")
      .eq("source_application_type", "volunteer")
      .eq("source_application_id", id)
      .order("starts_at", { ascending: true })
    if (error) throw new Error("등록된 일정을 불러오지 못했습니다. 새로고침해 주세요.")
    linkedEvents = data ?? []
  }
  const isMember = !!app.created_by
  const isGroup = app.party_size > 1

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <div className="mb-6 rounded-2xl border border-border bg-card p-5">
        <nav className="mb-4 text-sm text-muted-foreground">
          <Link href={returnHref} className="hover:text-foreground">
            ← 신청 목록
          </Link>
        </nav>

        {/* 헤더 */}
        <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">
              봉사 신청 상세
            </h1>
            <ApplicationBadge status={app.status} />
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <span>
              {new Date(app.submitted_at).toLocaleString("ko-KR", {
                timeZone: "Asia/Seoul",
                dateStyle: "medium",
                timeStyle: "short",
                hour12: false,
              })}{" "}
              제출
            </span>
            <span>·</span>
            {isMember ? (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                회원
              </span>
            ) : (
              <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                비회원
              </span>
            )}
            <span>·</span>
            {isGroup ? (
              <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                단체 ({app.party_size}명)
              </span>
            ) : (
              <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                개인
              </span>
            )}
          </p>
          {app.status === "취소" ? (
            <div className="mt-3 space-y-1.5 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <p>취소된 신청입니다.</p>
              {(app as typeof app & { cancel_reason?: string }).cancel_reason && (
                <p>
                  <span className="font-semibold">취소 사유 · </span>
                  {(app as typeof app & { cancel_reason?: string }).cancel_reason}
                </p>
              )}
            </div>
          ) : app.status === "일정변경요청" ? (
            <div className="mt-3 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-700/50 dark:bg-blue-950/30 dark:text-blue-300">
              일정변경 요청이 접수됐어요. 아래에서 <span className="font-semibold">승인 또는 거절</span> 처리해주세요.
            </div>
          ) : app.status !== "접수" ? (
            <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-300">
              이 신청은 이미 <span className="font-semibold">{app.status}</span> 처리되었어요.
            </div>
          ) : null}
        </div>

        {/* 빠른 연락 */}
        <div className="flex flex-wrap gap-2">
          <a href="#application-processing" className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm xl:hidden">신청 처리로 이동</a>
          <ContactButton href={`tel:${app.phone}`} icon={Phone} label="전화" />
          <ContactButton
            href={`sms:${app.phone}`}
            icon={MessageSquare}
            label="문자"
          />
        </div>
        </header>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.85fr)]">
      <div className="min-w-0 [overflow-wrap:anywhere]">
      {app.status === "일정변경요청" && <section className="mb-6 rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-semibold">일정변경 요청 비교</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><h3 className="mb-2 text-xs text-muted-foreground">현재 캘린더 일정 · {linkedEvents.length}건</h3>
            {linkedEvents.length ? <ul className="space-y-1 text-sm">{linkedEvents.map(event => <li key={event.id}>{applicationDate(event.starts_at, true)}</li>)}</ul> : <p className="text-sm">등록된 일정 없음</p>}
          </div>
          <div><h3 className="mb-2 text-xs text-muted-foreground">변경 요청 일정 · {requestedDates.length}건</h3>
            {requestedDates.length ? <ul className="space-y-1 text-sm">{requestedDates.map(date => <li key={date}>{applicationDate(date)} · {app.reschedule_time || "시간 미입력"}</li>)}</ul> : <p className="text-sm">요청 날짜 없음</p>}
          </div>
        </div>
      </section>}
      <section className="mb-6 grid gap-4 md:grid-cols-2">
        <Card title={isGroup ? "단체 / 인솔자 정보" : "신청자 정보"}>
          {isGroup && (
            <Row label="단체명" value={app.group_name ?? "미입력"} />
          )}
          <Row
            label={isGroup ? "인솔자" : "이름"}
            value={app.applicant_name}
          />
          <Row
            label="연락처"
            icon={Phone}
            value={
              <a
                href={`tel:${app.phone}`}
                className="text-primary hover:underline"
              >
                {formatKoreanPhone(app.phone)}
              </a>
            }
          />
          <Row
            icon={Users}
            label="인원수"
            value={`${app.party_size}명${isGroup ? " (단체)" : ""}`}
          />
          {isMember && (
            <Row
              icon={KeyRound}
              label="가입 방법"
              value={providerLabel(app.signup_provider)}
            />
          )}
        </Card>

        <Card title="가능 일정">
          <div className="flex items-baseline gap-3">
            <span className="w-24 shrink-0 text-xs text-muted-foreground">가능 날짜</span>
            {app.available_dates.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {app.available_dates.map((date) => {
                  const wd = ["일", "월", "화", "수", "목", "금", "토"][new Date(date).getDay()]
                  return (
                    <span key={date} className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-foreground">
                      {date.slice(5).replace("-", "/")} ({wd})
                    </span>
                  )
                })}
              </div>
            ) : app.available_days.length > 0 ? (
              <span className="font-medium text-foreground">{app.available_days.join(", ")}요일</span>
            ) : (
              <span className="font-medium text-foreground">—</span>
            )}
          </div>
          <Row label="시간대" value={app.available_time ?? "—"} />

          {requestedDates.length > 0 && (
            <details className="mt-3 rounded-md border border-border bg-secondary/30">
              <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary/50 rounded-md">
                날짜별 출근 예정 운영진 ({requestedDates.length}일)
              </summary>
              <div className="space-y-2 px-3 pb-3 pt-1">
                {requestedDates.map((date) => {
                  const list = staffByDate[date] ?? []
                  const dt = new Date(date)
                  const wd = ["일", "월", "화", "수", "목", "금", "토"][dt.getDay()]
                  return (
                    <div key={date}>
                      <p className="text-xs font-medium text-foreground">
                        {date} ({wd})
                      </p>
                      <div className="mt-0.5 pl-2">
                        <StaffAvailabilityDisplay items={list} showNote />
                      </div>
                    </div>
                  )
                })}
              </div>
            </details>
          )}
        </Card>

      </section>

      {/* 자기소개 / 메모 */}
      {app.message && (
        <section className="mb-6 rounded-xl border border-border bg-card p-5">
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            자기소개 / 메모
          </h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {app.message}
          </p>
        </section>
      )}

      {/* 신청 시 동의 사항 */}
      <section className="mb-6 rounded-xl border border-border bg-card p-5">
        <h2 className="mb-2 text-sm font-semibold text-foreground">
          신청 시 동의·확인 사항
        </h2>
        <ul className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
          <li>• 봉사 활동 중 위험(물림·스크래치·알레르기) 인지</li>
          <li>• 단체의 안전 수칙 준수</li>
          {isGroup && <li>• 미성년자 포함 시 보호자 동의·인솔</li>}
          <li>• 개인정보 수집·이용 동의</li>
          <li>• 이용약관 동의</li>
        </ul>
        <p className="mt-2 text-[11px] text-muted-foreground/80">
          신청 폼에서 위 항목을 모두 체크해야 제출이 가능합니다.
        </p>
      </section>

      {/* 등록된 캘린더 일정 — 다중 날짜 지원 */}
      <section className="mb-6 rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            등록된 캘린더 일정 ({linkedEvents.length})
          </h2>
          {app.status === "승인" && (
            <Link
              href={`/admin/calendar/new?from=${app.id}`}
              className="rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15"
            >
              + 일정 추가
            </Link>
          )}
        </div>
        {linkedEvents.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {app.status === "승인"
              ? "아직 캘린더에 등록된 일정이 없습니다. 일정 추가 버튼으로 등록할 수 있습니다."
              : "승인 처리 후 확정한 일정을 캘린더에 등록할 수 있습니다."}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {linkedEvents.map((ev) => (
              <li
                key={ev.id}
                className="flex items-center justify-between gap-2 py-2 text-sm"
              >
                <span className="min-w-0">
                  <span className="font-medium text-foreground">{getEventTitle(ev)}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {new Date(ev.starts_at).toLocaleString("ko-KR", {
                      timeZone: "Asia/Seoul",
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </span>
                <Link
                  href={`/admin/calendar/${ev.id}`}
                  className="shrink-0 text-xs text-primary hover:underline"
                >
                  상세 →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      </div>
      <aside id="application-processing" className="min-w-0 scroll-mt-20">
      {/* 처리 */}
      <ApplicationStatusForm
        id={app.id}
        returnHref={returnHref}
        currentCancelReason={(app as typeof app & { cancel_reason?: string | null }).cancel_reason}
        kind="volunteer"
        currentStatus={app.status}
        currentNote={app.admin_note}
        applicantName={formatVolunteerApplicantName(
          app.applicant_name,
          app.group_name
        )}
        linkedEventCount={linkedEvents.length}
        linkedEvents={linkedEvents}
        hint={{
          availableDates: app.status === "일정변경요청" && app.reschedule_dates?.length
            ? app.reschedule_dates
            : app.available_dates,
          availableTime: app.status === "일정변경요청" && app.reschedule_time
            ? app.reschedule_time
            : app.available_time,
        }}
        rescheduleInfo={
          app.status === "일정변경요청" && app.reschedule_dates?.length
            ? { dates: app.reschedule_dates, time: app.reschedule_time ?? null }
            : undefined
        }
        approvalInfo={
          app.approved_by_profile && app.approved_at
            ? {
                nickname: app.approved_by_profile.nickname,
                role: app.approved_by_profile.role,
                approvedAt: app.approved_at,
              }
            : null
        }
      />
      </aside>
      </div>
    </div>
  )
}

function Card({
  title,
  className,
  children,
}: {
  title: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`rounded-xl border border-border bg-card p-4 sm:p-5 ${className ?? ""}`}>
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      <div className="space-y-2 text-sm">{children}</div>
    </div>
  )
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof Phone
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="flex w-24 shrink-0 items-center gap-1 text-xs text-muted-foreground">
        {Icon && <Icon className="size-3" aria-hidden />}
        {label}
      </span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}

function ContactButton({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: typeof Phone
  label: string
}) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </a>
  )
}
