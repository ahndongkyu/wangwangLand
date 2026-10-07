import { volunteerDetailHref, volunteerReturnHref } from "@/features/applications/lib/detail-navigation"
import { dateKey } from "./date"
import type { CalendarEvent } from "../types"

export function calendarReturnHref(path: string, ym: string, date?: string, cat?: string) {
  const query = new URLSearchParams({ ym })
  if (date) query.set("date", date)
  if (cat) query.set("cat", cat)
  return volunteerReturnHref(`${path}?${query}`)
}

export function calendarEventHref(event: CalendarEvent, base: string, returnHref: string) {
  if (base === "/admin/calendar" && event.source_application_type === "volunteer" && event.source_application_id) {
    return volunteerDetailHref(event.source_application_id, returnHref, event.id)
  }
  return `${base}/${encodeURIComponent(event.id)}?${new URLSearchParams({ returnTo: returnHref })}`
}

export function eventReturnDay(event: CalendarEvent) { return dateKey(new Date(event.starts_at)) }
