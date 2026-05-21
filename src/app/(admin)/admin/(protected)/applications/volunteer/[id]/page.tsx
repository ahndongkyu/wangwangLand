import Link from "next/link"
import { notFound } from "next/navigation"
import { KeyRound, MessageSquare, Phone, Users } from "lucide-react"

import {
  ApplicationStatusForm,
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

const STATUS_COLOR: Record<string, string> = {
  접수: "bg-primary/15 text-primary",
  검토중: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
  승인: "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400",
  반려: "bg-muted text-muted-foreground",
  취소: "bg-muted text-muted-foreground/60",
  일정변경요청: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
}

const STATUS_HEADER_BG: Record<string, string> = {
  접수: "border-primary/30 bg-primary/5",
  검토중: "border-amber-300 bg-amber-50/60 dark:border-amber-700/50 dark:bg-amber-950/20",
  승인: "border-emerald-300 bg-emerald-50/60 dark:border-emerald-700/50 dark:bg-emerald-950/20",
  반려: "border-border bg-muted/30",
  취소: "border-border bg-muted/20",
  일정변경요청: "border-blue-300 bg-blue-50/60 dark:border-blue-700/50 dark:bg-blue-950/20",
}

export default async function VolunteerApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const app = await getVolunteerApplication(id)

  if (!app) notFound()

  // 봉사 신청 날짜에 출근 예정 운영진 조회
  const staffByDate = app.available_dates.length > 0
    ? await listStaffOnDates(app.available_dates)
    : {}

  // 자동 등록된 캘린더 이벤트들 (다중 날짜 신청 지원으로 여러 개 가능).
  // status form 의 단일 날짜 입력에는 첫 번째만 prefill, 나머지는 별도 카드로 표시.
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
    const { data } = await admin
      .from("events")
      .select("id, title, starts_at, ends_at, source_application_id")
      .eq("source_application_type", "volunteer")
      .eq("source_application_id", id)
      .order("starts_at", { ascending: true })
    linkedEvents = data ?? []
  }
  const isMember = !!app.created_by
  const isGroup = app.party_size > 1

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-6">
      <div className={`mb-6 rounded-xl border p-5 ${STATUS_HEADER_BG[app.status] ?? "border-border bg-card"}`}>
        <nav className="mb-4 text-sm text-muted-foreground">
          <Link href="/admin/applications" className="hover:text-foreground">
            ← 신청 목록
          </Link>
        </nav>

        {/* 헤더 */}
        <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">
              봉사 신청 상세
            </h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOR[app.status] ?? "bg-secondary"}`}
            >
              {app.status}
            </span>
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
              <p>신청자가 직접 취소한 신청입니다.</p>
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
          <ContactButton href={`tel:${app.phone}`} icon={Phone} label="전화" />
          <ContactButton
            href={`sms:${app.phone}`}
            icon={MessageSquare}
            label="문자"
          />
        </div>
        </header>
      </div>

      <section className="mb-6 grid gap-4 md:grid-cols-2">
        <Card title={isGroup ? "단체 / 인솔자 정보" : "신청자 정보"}>
          <Row
            label={isGroup ? "단체명/인솔자" : "이름"}
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

          {app.available_dates.length > 0 && (
            <details className="mt-3 rounded-md border border-border bg-secondary/30">
              <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary/50 rounded-md">
                날짜별 출근 예정 운영진 ({app.available_dates.length}일)
              </summary>
              <div className="space-y-2 px-3 pb-3 pt-1">
                {app.available_dates.map((date) => {
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

        <Card title="희망 활동" className="md:col-span-2">
          <div className="flex flex-wrap gap-2">
            {app.activities.length === 0 ? (
              <span className="text-sm text-muted-foreground">—</span>
            ) : (
              app.activities.map((a) => (
                <span
                  key={a}
                  className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                >
                  {a}
                </span>
              ))
            )}
          </div>
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
      <section className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 dark:border-emerald-900/40 dark:bg-emerald-900/10">
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
          <Link
            href={`/admin/calendar/new?from=${app.id}`}
            className="rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15"
          >
            + 일정 추가
          </Link>
        </div>
        {linkedEvents.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            아직 캘린더에 등록된 일정이 없습니다. 신청한 날짜가 여러 개라면
            <strong className="text-foreground"> 일정 추가</strong> 버튼으로 각각 등록하세요.
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

      {/* 처리 */}
      <h2 className="mb-3 text-lg font-semibold text-foreground">처리</h2>
      <ApplicationStatusForm
        id={app.id}
        kind="volunteer"
        currentStatus={app.status}
        currentNote={app.admin_note}
        applicantName={app.applicant_name}
        linkedEventCount={linkedEvents.length}
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
      />
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
    <div className={`rounded-xl border border-border bg-card p-5 ${className ?? ""}`}>
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
