export type EventCategory = "volunteer" | "event" | "closed"

export interface CalendarEvent {
  id: string
  category: EventCategory
  title: string
  description: string | null
  location: string | null
  starts_at: string
  ends_at: string
  all_day: boolean
  signup_enabled: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface EventSignup {
  id: string
  event_id: string
  user_id: string
  party_size: number
  message: string | null
  status: "접수" | "취소"
  created_at: string
  updated_at: string
}

export type EventWithSignupCount = CalendarEvent & {
  signup_count: number
}

export type EventWithMySignup = CalendarEvent & {
  my_signup: EventSignup | null
}

export const CATEGORY_LABEL: Record<EventCategory, string> = {
  volunteer: "봉사",
  event: "행사",
  closed: "휴무",
}

/**
 * 카테고리별 색 토큰. tailwind 클래스에 직접 대입.
 * - bg/text: 칩(이벤트 막대)에 사용
 * - dot: 미니 캘린더의 점
 */
export const CATEGORY_COLOR: Record<
  EventCategory,
  { bg: string; text: string; dot: string; soft: string; softText: string }
> = {
  volunteer: {
    bg: "bg-primary",
    text: "text-primary-foreground",
    dot: "bg-primary",
    soft: "bg-primary/15",
    softText: "text-primary",
  },
  event: {
    bg: "bg-emerald-600",
    text: "text-white",
    dot: "bg-emerald-600",
    soft: "bg-emerald-100 dark:bg-emerald-900/30",
    softText: "text-emerald-700 dark:text-emerald-400",
  },
  closed: {
    bg: "bg-muted-foreground/70",
    text: "text-background",
    dot: "bg-muted-foreground/70",
    soft: "bg-muted",
    softText: "text-muted-foreground",
  },
}
