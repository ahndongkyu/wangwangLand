import Link from "next/link"
import { notFound } from "next/navigation"
import { Calendar, History, MapPin, Users } from "lucide-react"

import {
  CATEGORY_COLOR,
  customColorStyle,
  eventDisplayLabel,
  getEventTitle,
  getEventWithMySignup,
  listRecurrenceGroupDates,
} from "@/features/events"
import { DeleteEventButton } from "@/features/events/components/delete-event-button"
import { formatKoreanDayLabel } from "@/features/events/lib/date"
import { createAdminClient } from "@/shared/lib/supabase/admin"
import { cn } from "@/shared/lib/utils"

export const dynamic = "force-dynamic"

export default async function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const event = await getEventWithMySignup(id)
  if (!event) notFound()

  const creator = event.created_by
    ? await getEventCreator(event.created_by)
    : null

  // 반복 그룹이면 같은 그룹 일정들 (삭제 범위 선택용)
  const groupDates = event.recurrence_group_id
    ? await listRecurrenceGroupDates(event.recurrence_group_id)
    : []

  const isCustom = event.category === "custom"
  const color = CATEGORY_COLOR[event.category]
  const customStyle = isCustom ? customColorStyle(event.custom_color) : null
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/admin/calendar" className="hover:text-foreground">
          ← 일정 관리
        </Link>
      </nav>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <span
            style={customStyle?.soft}
            className={cn(
              "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold",
              !isCustom && color.soft,
              !isCustom && color.softText
            )}
          >
            {eventDisplayLabel(event)}
          </span>
          {groupDates.length > 1 && (
            <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
              🔁 반복 일정 ({groupDates.length}회)
            </span>
          )}
          <h1 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">
            {getEventTitle(event)}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/calendar/${id}/edit`}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
          >
            수정
          </Link>
          <DeleteEventButton
            id={id}
            groupDates={groupDates}
            currentStartsAt={event.starts_at}
          />
        </div>
      </header>

      <section className="mb-6 space-y-2 rounded-lg border border-border bg-card p-5 text-sm">
        <Row icon={Calendar} label="일시">
          <span>{formatKoreanDayLabel(event.starts_at, event.all_day)}</span>
        </Row>
        {event.location && (
          <Row icon={MapPin} label="장소">
            <span>{event.location}</span>
          </Row>
        )}
        {event.source_application_id && event.source_application_type && (
          <Row icon={Users} label="원본">
            <Link
              href={`/admin/applications/${event.source_application_type}/${event.source_application_id}`}
              className="text-primary hover:underline"
            >
              {event.source_application_type === "volunteer" ? "봉사" : "입양"} 신청 상세 보기 →
            </Link>
          </Row>
        )}
        <Row icon={History} label="기록">
          <span className="text-[11px] text-muted-foreground/65">
            기록자 {creator?.nickname ?? "기록 없음"} · 등록 {formatCreatedAt(event.created_at)}
          </span>
        </Row>
      </section>

      {event.description && (
        <section className="mb-6 rounded-lg border border-border bg-card p-5">
          <h2 className="mb-2 text-sm font-semibold text-foreground">상세 안내</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {event.description}
          </p>
        </section>
      )}
    </div>
  )
}

async function getEventCreator(profileId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from("profiles")
    .select("nickname")
    .eq("id", profileId)
    .maybeSingle()

  return data as { nickname: string } | null
}

function formatCreatedAt(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
    hour12: false,
  }).format(new Date(iso))
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Calendar
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex w-16 shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </span>
      <span className="min-w-0 flex-1 text-foreground">{children}</span>
    </div>
  )
}
