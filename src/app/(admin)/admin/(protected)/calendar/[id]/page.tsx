import Link from "next/link"
import { notFound } from "next/navigation"
import { Calendar, MapPin, Phone, Users } from "lucide-react"

import {
  CATEGORY_COLOR,
  customColorStyle,
  eventDisplayLabel,
  getEventWithMySignup,
  listEventSignups,
} from "@/features/events"
import { DeleteEventButton } from "@/features/events/components/delete-event-button"
import { formatKoreanDayLabel } from "@/features/events/lib/date"
import { cn } from "@/shared/lib/utils"

export const dynamic = "force-dynamic"

export default async function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [event, signups] = await Promise.all([
    getEventWithMySignup(id),
    listEventSignups(id),
  ])
  if (!event) notFound()

  const isCustom = event.category === "custom"
  const color = CATEGORY_COLOR[event.category]
  const customStyle = isCustom ? customColorStyle(event.custom_color) : null
  const totalParty = signups
    .filter((s) => s.status === "접수")
    .reduce((sum, s) => sum + s.party_size, 0)

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
          <h1 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">
            {event.source_application_id
              ? event.title.replace(/^봉사\s*[–\-]\s*/, "")
              : event.title}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/calendar/${id}/edit`}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
          >
            수정
          </Link>
          <DeleteEventButton id={id} />
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
        {event.signup_enabled && (
          <Row icon={Users} label="신청">
            <span>
              {signups.filter((s) => s.status === "접수").length}건 · 총 {totalParty}명
            </span>
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
      </section>

      {event.description && (
        <section className="mb-6 rounded-lg border border-border bg-card p-5">
          <h2 className="mb-2 text-sm font-semibold text-foreground">상세 안내</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {event.description}
          </p>
        </section>
      )}

      {/* 신청자 명단 */}
      {event.signup_enabled && (
        <section className="rounded-lg border border-border bg-card">
          <h2 className="border-b border-border px-5 py-3 text-sm font-semibold text-foreground">
            신청자 ({signups.length})
          </h2>
          {signups.length === 0 ? (
            <p className="px-5 py-6 text-center text-xs text-muted-foreground">
              아직 신청자가 없습니다.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {signups.map((s) => (
                <li
                  key={s.id}
                  className={cn(
                    "flex flex-wrap items-center gap-3 px-5 py-3 text-sm",
                    s.status === "취소" && "opacity-50"
                  )}
                >
                  <span className="font-medium text-foreground">
                    {s.user.nickname}
                  </span>
                  {s.user.phone && (
                    <a
                      href={`tel:${s.user.phone}`}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <Phone className="size-3" aria-hidden />
                      {s.user.phone}
                    </a>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {s.party_size}명
                  </span>
                  {s.status === "취소" && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      취소
                    </span>
                  )}
                  {s.message && (
                    <span className="w-full text-xs text-muted-foreground">
                      메모: {s.message}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
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
