import { createClient } from "@/shared/lib/supabase/server"
import type {
  CalendarEvent,
  EventCategory,
  EventSignup,
  EventWithMySignup,
  EventWithSignupCount,
} from "../types"

interface RangeOptions {
  /** ISO timestamp (포함). null 이면 미정. */
  from?: string
  /** ISO timestamp (미포함). */
  to?: string
  categories?: EventCategory[]
  /**
   * true 면 internal 까지 포함 (운영진 전용 페이지).
   * 기본 false → public 만. RLS 가 internal 을 차단하지만 명시적으로도 필터.
   */
  includeInternal?: boolean
}

/** 기간 내 이벤트 목록. 신청 수 포함. */
export async function listEventsInRange({
  from,
  to,
  categories,
  includeInternal = false,
}: RangeOptions): Promise<EventWithSignupCount[]> {
  const supabase = await createClient()

  let q = supabase
    .from("events")
    .select("*")
    .order("starts_at", { ascending: true })

  if (from) q = q.gte("starts_at", from)
  if (to) q = q.lt("starts_at", to)
  if (categories && categories.length > 0) q = q.in("category", categories)
  if (!includeInternal) q = q.eq("visibility", "public")

  const { data, error } = await q
  if (error || !data) {
    if (error) console.error("[listEventsInRange]", error)
    return []
  }

  // 신청 수 집계 (한 번에)
  const ids = (data as CalendarEvent[]).map((e) => e.id)
  const counts = await fetchSignupCounts(ids)

  return (data as CalendarEvent[]).map((e) => ({
    ...e,
    signup_count: counts[e.id] ?? 0,
  }))
}

/** 다가오는 이벤트 N개 (회원 페이지 카드 리스트용) — public 만 */
export async function listUpcomingEvents(
  limit = 20,
  opts: { categories?: EventCategory[] } = {}
): Promise<EventWithSignupCount[]> {
  const supabase = await createClient()
  let q = supabase
    .from("events")
    .select("*")
    .eq("visibility", "public")
    .gte("ends_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(limit)
  if (opts.categories && opts.categories.length > 0) {
    q = q.in("category", opts.categories)
  }

  const { data, error } = await q
  if (error || !data) {
    if (error) console.error("[listUpcomingEvents]", error)
    return []
  }
  const ids = (data as CalendarEvent[]).map((e) => e.id)
  const counts = await fetchSignupCounts(ids)
  return (data as CalendarEvent[]).map((e) => ({
    ...e,
    signup_count: counts[e.id] ?? 0,
  }))
}

async function fetchSignupCounts(
  eventIds: string[]
): Promise<Record<string, number>> {
  if (eventIds.length === 0) return {}
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("event_signups")
    .select("event_id")
    .in("event_id", eventIds)
    .eq("status", "접수")
  if (error || !data) return {}
  const counts: Record<string, number> = {}
  for (const row of data as { event_id: string }[]) {
    counts[row.event_id] = (counts[row.event_id] ?? 0) + 1
  }
  return counts
}

/** 단일 이벤트 + 본인 신청 (있으면) */
export async function getEventWithMySignup(
  id: string
): Promise<EventWithMySignup | null> {
  const supabase = await createClient()
  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error || !event) {
    if (error) console.error("[getEventWithMySignup]", error)
    return null
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  let my_signup: EventSignup | null = null
  if (session?.user) {
    const { data: signup } = await supabase
      .from("event_signups")
      .select("*")
      .eq("event_id", id)
      .eq("user_id", session.user.id)
      .maybeSingle()
    my_signup = (signup as EventSignup) ?? null
  }

  return { ...(event as CalendarEvent), my_signup }
}

/** 어드민: 이벤트 신청자 명단 */
export async function listEventSignups(eventId: string): Promise<
  Array<EventSignup & { user: { nickname: string; phone: string | null } }>
> {
  const { createAdminClient } = await import("@/shared/lib/supabase/admin")
  const admin = createAdminClient()
  const { data: signups } = await admin
    .from("event_signups")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true })
  if (!signups) return []

  const userIds = [...new Set((signups as EventSignup[]).map((s) => s.user_id))]
  const { data: users } = await admin
    .from("profiles")
    .select("id, nickname, phone")
    .in("id", userIds)

  const userMap = new Map<string, { nickname: string; phone: string | null }>()
  for (const u of (users ?? []) as Array<{ id: string; nickname: string; phone: string | null }>) {
    userMap.set(u.id, { nickname: u.nickname, phone: u.phone })
  }

  return (signups as EventSignup[]).map((s) => ({
    ...s,
    user: userMap.get(s.user_id) ?? { nickname: "알 수 없음", phone: null },
  }))
}

/** 본인이 신청한 이벤트 목록 (마이페이지용) — event_signups 직접 신청만 */
export async function listMyUpcomingSignups(): Promise<
  Array<EventSignup & { event: CalendarEvent }>
> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return []

  const { data, error } = await supabase
    .from("event_signups")
    .select("*, event:events(*)")
    .eq("user_id", session.user.id)
    .eq("status", "접수")
    .gte("event.ends_at", new Date().toISOString())
    .order("created_at", { ascending: false })

  if (error || !data) return []
  return (data as Array<EventSignup & { event: CalendarEvent }>).filter(
    (r) => r.event !== null
  )
}

/**
 * 회원 본인이 관여된 다가오는 일정 (회원용 /calendar 리스트).
 * 두 가지 경로 합침:
 *  1. 본인 봉사 신청을 어드민이 캘린더에 등록한 이벤트
 *  2. event_signups 로 직접 신청한 이벤트
 * 같은 이벤트가 양쪽에 있으면 중복 제거. 시작 시간 가까운 순 정렬.
 */
export async function listMyUpcomingEvents(): Promise<CalendarEvent[]> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) return []

  const userId = session.user.id
  const nowIso = new Date().toISOString()

  // 본인 봉사 신청 id 들 (RLS 가 막으므로 admin client 사용)
  const { createAdminClient } = await import("@/shared/lib/supabase/admin")
  const admin = createAdminClient()
  const { data: myApps } = await admin
    .from("volunteer_applications")
    .select("id")
    .eq("created_by", userId)
  const appIds = ((myApps ?? []) as Array<{ id: string }>).map((a) => a.id)

  // 1. 봉사 신청 → 자동 등록된 이벤트
  let appLinkedEvents: CalendarEvent[] = []
  if (appIds.length > 0) {
    const { data } = await admin
      .from("events")
      .select("*")
      .eq("source_application_type", "volunteer")
      .in("source_application_id", appIds)
      .gte("ends_at", nowIso)
      .order("starts_at", { ascending: true })
    appLinkedEvents = (data ?? []) as CalendarEvent[]
  }

  // 2. 직접 신청한 이벤트
  const { data: signupRows } = await supabase
    .from("event_signups")
    .select("event:events(*)")
    .eq("user_id", userId)
    .eq("status", "접수")
  // supabase 가 단일 join 결과도 배열로 반환하는 경우가 있어 평탄화.
  const directEvents: CalendarEvent[] = []
  for (const row of (signupRows ?? []) as Array<{
    event: CalendarEvent | CalendarEvent[] | null
  }>) {
    const e = Array.isArray(row.event) ? row.event[0] : row.event
    if (e && e.ends_at >= nowIso) directEvents.push(e)
  }

  // 합치고 dedupe (id 기준)
  const map = new Map<string, CalendarEvent>()
  for (const e of appLinkedEvents) map.set(e.id, e)
  for (const e of directEvents) if (!map.has(e.id)) map.set(e.id, e)

  return Array.from(map.values()).sort((a, b) =>
    a.starts_at.localeCompare(b.starts_at)
  )
}
