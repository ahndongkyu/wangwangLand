export type EventCategory =
  | "volunteer"
  | "event"
  | "closed"
  | "custom"
  | "adoption_consult"
  | "foster_consult"

/** 항상 internal(관리자 전용)로 저장되는 카테고리. */
export const INTERNAL_CATEGORIES: EventCategory[] = [
  "adoption_consult",
  "foster_consult",
]

export type EventVisibility = "public" | "internal"
export type EventSourceApplicationType = "volunteer" | "adoption"

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
  visibility: EventVisibility
  custom_label: string | null
  custom_color: string | null
  source_application_type: EventSourceApplicationType | null
  source_application_id: string | null
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
  custom: "기타",
  adoption_consult: "입양상담",
  foster_consult: "임보상담",
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
  custom: {
    // custom 카테고리는 inline style 로 색을 입혀야 하므로 토큰은 의미 없음.
    // 기본 fallback (custom_color 가 null 일 때).
    bg: "bg-muted-foreground/70",
    text: "text-background",
    dot: "bg-muted-foreground/70",
    soft: "bg-muted",
    softText: "text-muted-foreground",
  },
  adoption_consult: {
    bg: "bg-blue-600",
    text: "text-white",
    dot: "bg-blue-600",
    soft: "bg-blue-100 dark:bg-blue-900/30",
    softText: "text-blue-700 dark:text-blue-400",
  },
  foster_consult: {
    bg: "bg-violet-600",
    text: "text-white",
    dot: "bg-violet-600",
    soft: "bg-violet-100 dark:bg-violet-900/30",
    softText: "text-violet-700 dark:text-violet-400",
  },
}

/** custom 카테고리에서 사용. event 의 custom_label 이 있으면 그걸, 없으면 fallback. */
export function eventDisplayLabel(event: {
  category: EventCategory
  custom_label: string | null
}): string {
  if (event.category === "custom" && event.custom_label) return event.custom_label
  return CATEGORY_LABEL[event.category]
}

/**
 * 이름 마스킹: 1글자=그대로, 2글자="홍*", 3글자+="홍**".
 */
export function maskName(name: string): string {
  const trimmed = name.trim()
  if (trimmed.length <= 1) return trimmed
  if (trimmed.length === 2) return trimmed[0] + "*"
  return trimmed[0] + "*".repeat(Math.min(trimmed.length - 1, 2))
}

/**
 * 봉사 신청 자동 이벤트 제목 마스킹.
 * "홍길동" → "홍**" / "홍길동 외 2명" → "홍** 외 2명"
 * source_application_type=volunteer 인 이벤트에만 호출해야 함.
 */
export function maskEventTitle(title: string): string {
  const m = title.match(/^(.+?)( 외 \d+명)?$/)
  if (!m) return maskName(title)
  return maskName(m[1]) + (m[2] ?? "")
}

/**
 * 봉사 신청 자동 등록 시 저장된 구형 "봉사 – 이름" 접두사 제거.
 * source_application_id 가 있는 이벤트에만 적용.
 */
export function getEventTitle(event: {
  title: string
  source_application_id: string | null
}): string {
  if (event.source_application_id) {
    return event.title.replace(/^봉사\s*[–\-]\s*/, "")
  }
  return event.title
}

/**
 * 공개 화면 표시용 이벤트 제목.
 * 봉사 신청 자동 등록 이벤트는 마스킹, 그 외는 그대로.
 */
export function publicEventTitle(event: {
  title: string
  source_application_type: EventSourceApplicationType | null
  source_application_id: string | null
}): string {
  if (event.source_application_type === "volunteer") {
    return maskEventTitle(getEventTitle(event))
  }
  return event.title
}

/**
 * 캘린더 칩에 적용할 inline style.
 * custom 카테고리에서만 사용 — bg/text 색을 인라인으로 강제.
 */
export function customColorStyle(hex: string | null): {
  background: { backgroundColor: string; color: string }
  soft: { backgroundColor: string; color: string }
  dot: { backgroundColor: string }
} {
  const safe = hex && /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : "#9CA3AF"
  return {
    background: { backgroundColor: safe, color: pickContrastColor(safe) },
    soft: { backgroundColor: `${safe}26`, color: safe },
    dot: { backgroundColor: safe },
  }
}

/** 헥스 배경 위에 흰색/검정 중 어느게 더 잘 읽히는지 */
function pickContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? "#1F1B16" : "#FFFFFF"
}
