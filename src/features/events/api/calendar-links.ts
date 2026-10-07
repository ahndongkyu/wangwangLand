import { createClient } from "@/shared/lib/supabase/server"
import { createAdminClient } from "@/shared/lib/supabase/admin"
import type { CalendarEvent } from "../types"
import { calendarReturnHref, calendarEventHref, eventReturnDay } from "../lib/navigation"

export async function getCalendarApplicationLinks(events: CalendarEvent[], path: string, ym: string) {
  const links: Record<string, { href: string; label: string }> = {}
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return links
  const { data: profile } = await client.from("profiles").select("role").eq("id", user.id).maybeSingle()
  const staff = profile?.role === "staff" || profile?.role === "admin"
  const linked = events.filter(event => event.source_application_type === "volunteer" && event.source_application_id)
  if (!linked.length) return links
  let ownIds = new Set<string>()
  if (!staff) {
    const { data } = await createAdminClient().from("volunteer_applications").select("id").eq("created_by", user.id).in("id", linked.map(event => event.source_application_id!))
    ownIds = new Set((data ?? []).map(row => row.id))
  }
  for (const event of linked) {
    if (staff) links[event.id] = { label: "관리하기", href: calendarEventHref(event, "/admin/calendar", calendarReturnHref(path, ym, eventReturnDay(event))) }
    else if (ownIds.has(event.source_application_id!)) links[event.id] = { label: "내 신청 보기", href: `/my/applications?application=${encodeURIComponent(event.source_application_id!)}#volunteer-${event.source_application_id}` }
  }
  return links
}
