import { applicationReturnHref, validDate } from "./admin-list"

const CALENDAR_PATHS = ["/", "/calendar", "/admin", "/admin/calendar"]

export function volunteerReturnHref(value: string | string[] | undefined) {
  if (typeof value !== "string") return applicationReturnHref(undefined, "volunteer")
  if (value.startsWith("/admin/applications?")) return applicationReturnHref(value, "volunteer")
  const [path, raw = ""] = value.split("#")[0].split("?")
  if (!CALENDAR_PATHS.includes(path)) return applicationReturnHref(undefined, "volunteer")
  const input = new URLSearchParams(raw), query = new URLSearchParams()
  const ym = input.get("ym"), date = input.get("date"), cat = input.get("cat")
  if (ym && /^\d{4}-(0[1-9]|1[0-2])$/.test(ym)) query.set("ym", ym)
  if (date && validDate(date)) query.set("date", date)
  if (cat && /^[a-z_,]+$/.test(cat)) query.set("cat", cat)
  return `${path}${query.size ? `?${query}` : ""}${path === "/" ? "#volunteer-calendar" : ""}`
}

export function volunteerDetailHref(id: string, returnHref: string, eventId?: string) {
  const query = new URLSearchParams({ returnTo: volunteerReturnHref(returnHref) })
  if (eventId) query.set("event", eventId)
  return `/admin/applications/volunteer/${encodeURIComponent(id)}?${query}`
}

export function applicationBackLabel(href: string) {
  if (href.startsWith("/admin/applications?")) return "신청 목록으로 돌아가기"
  if (href.startsWith("/?") || href === "/#volunteer-calendar") return "메인화면 캘린더로 돌아가기"
  return "캘린더로 돌아가기"
}

export function eventEditReturnHref(value: string | string[] | undefined, eventId: string) {
  const fallback = `/admin/calendar/${encodeURIComponent(eventId)}`
  if (typeof value !== "string") return fallback
  const [path, raw = ""] = value.split("?")
  const match = path.match(/^\/admin\/applications\/volunteer\/([a-zA-Z0-9_-]+)$/)
  if (!match) return fallback
  const query = new URLSearchParams(raw)
  return volunteerDetailHref(match[1], volunteerReturnHref(query.get("returnTo") ?? undefined), eventId)
}
