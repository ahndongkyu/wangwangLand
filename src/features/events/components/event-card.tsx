import Link from "next/link"
import { Calendar, MapPin, Users } from "lucide-react"

import {
  CATEGORY_COLOR,
  CATEGORY_LABEL,
  customColorStyle,
  eventDisplayLabel,
  publicEventTitle,
  type EventWithSignupCount,
} from "../types"
import { formatKoreanDayLabel } from "../lib/date"
import { cn } from "@/shared/lib/utils"

interface Props {
  event: EventWithSignupCount
  /** href base. 기본 /calendar */
  basePath?: string
  /** true 면 봉사 자동 이벤트의 이름을 마스킹. 공개 페이지에서 사용. */
  maskNames?: boolean
}

export function EventCard({ event, basePath = "/calendar", maskNames = false }: Props) {
  const isCustom = event.category === "custom"
  const color = CATEGORY_COLOR[event.category]
  const customStyle = isCustom ? customColorStyle(event.custom_color) : null

  return (
    <Link
      href={`${basePath}/${event.id}`}
      className="block rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm sm:p-5"
    >
      <div className="flex items-start gap-3">
        {/* 카테고리 칩 */}
        <span
          style={customStyle?.soft}
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
            !isCustom && color.soft,
            !isCustom && color.softText
          )}
        >
          {eventDisplayLabel(event)}
        </span>
        <h3 className="min-w-0 flex-1 truncate text-base font-bold text-foreground sm:text-lg">
          {maskNames ? publicEventTitle(event) : event.title}
        </h3>
        {event.signup_enabled && event.signup_count > 0 && (
          <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            <Users className="size-3" aria-hidden />
            {event.signup_count}명
          </span>
        )}
      </div>

      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Calendar className="size-3.5 shrink-0" aria-hidden />
          <span>{formatKoreanDayLabel(event.starts_at, event.all_day)}</span>
        </div>
        {event.location && (
          <div className="flex items-center gap-1.5">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{event.location}</span>
          </div>
        )}
      </div>

      {event.description && (
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground/90">
          {event.description}
        </p>
      )}
    </Link>
  )
}
