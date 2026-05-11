import Link from "next/link"
import { notFound } from "next/navigation"
import { Calendar, MapPin } from "lucide-react"

import {
  CATEGORY_COLOR,
  customColorStyle,
  eventDisplayLabel,
  getEventWithMySignup,
  publicEventTitle,
} from "@/features/events"
import { formatKoreanDayLabel } from "@/features/events/lib/date"
import { cn } from "@/shared/lib/utils"

export const dynamic = "force-dynamic"

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const event = await getEventWithMySignup(id)
  if (!event) notFound()

  const isCustom = event.category === "custom"
  const color = CATEGORY_COLOR[event.category]
  const customStyle = isCustom ? customColorStyle(event.custom_color) : null

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 md:py-14">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/calendar" className="hover:text-foreground">
          ← 일정 목록
        </Link>
      </nav>

      <header className="mb-6">
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
          {publicEventTitle(event)}
        </h1>
      </header>

      <section className="mb-6 space-y-2 rounded-lg border border-border bg-card p-5 text-sm">
        <Row icon={Calendar} label="일시">
          <span>{formatKoreanDayLabel(event.starts_at, event.all_day)}</span>
          {!event.all_day && (
            <span className="text-muted-foreground">
              {" "}
              ~ {formatKoreanDayLabel(event.ends_at, false)}
            </span>
          )}
        </Row>
        {event.location && (
          <Row icon={MapPin} label="장소">
            <span>{event.location}</span>
          </Row>
        )}
      </section>

      {/* 봉사 신청 자동 이벤트의 description 은 신청자 사적 정보(활동·메모·시간대 등)를 포함하므로 공개 화면에서는 숨김. */}
      {event.description && event.source_application_type !== "volunteer" && (
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
