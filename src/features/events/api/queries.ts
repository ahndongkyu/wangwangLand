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
}

/** 기간 내 이벤트 목록. 신청 수 포함. */
export async function listEventsInRange({
  from,
  to,
  categories,
}: RangeOptions): Promise<EventWithSignupCount[]> {
  const supabase = await createClient()

  let q = supabase
    .from("events")
    .select("*")
    .order("starts_at", { ascending: true })

  if (from) q = q.gte("starts_at", from)
  if (to) q = q.lt("starts_at", to)
  if (categories && categories.length > 0) q = q.in("category", categories)

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

/** 다가오는 이벤트 N개 (회원 페이지 카드 리스트용) */
export async function listUpcomingEvents(
  limit = 20,
  opts: { categories?: EventCategory[] } = {}
): Promise<EventWithSignupCount[]> {
  const supabase = await createClient()
  let q = supabase
    .from("events")
    .select("*")
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

/** 본인이 신청한 이벤트 목록 (마이페이지용) */
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
