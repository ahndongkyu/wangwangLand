import { requireAdmin } from "@/shared/lib/auth"
import { createClient } from "@/shared/lib/supabase/server"
import type { VolunteerApplication } from "@/shared/types/database"
import type { AdoptionRow } from "./queries"
import { datesInRange, type ApplicationFilters } from "../lib/admin-list"

export type AdminApplicationRow = (VolunteerApplication | AdoptionRow) & { linkedCount?: number }
export async function getAdminApplicationList(filters: ApplicationFilters) {
  const empty = { rows: [] as AdminApplicationRow[], total: 0, counts: {} as Record<string, number>, error: "", eventsError: false }
  const auth = await requireAdmin()
  if (!auth.ok) return { ...empty, error: auth.error }
  if (filters.error) return { ...empty, error: filters.error }
  const client = await createClient()
  const table = filters.type === "volunteer" ? "volunteer_applications" : "adoption_applications"
  const statuses = filters.type === "volunteer" ? ["접수", "검토중", "일정변경요청"] : ["접수", "검토중"]
  const totals = await Promise.all(statuses.map(async status => {
    const result = await client.from(table).select("id", { count: "exact", head: true }).eq("status", status)
    return { status, count: result.count ?? 0, error: result.error }
  }))
  const counts = Object.fromEntries(totals.map(row => [row.status, row.count]))
  if (totals.some(row => row.error)) return { ...empty, error: "신청 집계를 불러오지 못했습니다. 새로고침해 주세요." }
  function query(part: "request" | "rest" | "all") {
    let q = filters.type === "volunteer"
      ? client.from("volunteer_applications").select("*", { count: "exact" })
      : client.from("adoption_applications").select("*, dog:dogs(id, name), cat:cats(id, name)", { count: "exact" })
    if (filters.status === "처리 필요") q = q.in("status", statuses)
    else if (filters.status === "반려·취소") q = q.in("status", ["반려", "취소"])
    else if (filters.status !== "전체") q = q.eq("status", filters.status)
    if (part === "request") q = q.eq("status", "일정변경요청")
    if (part === "rest") q = q.neq("status", "일정변경요청")
    // PostgREST 논리 구문 문자를 제거하고 사용자 검색어를 값으로만 사용합니다.
    const search = filters.q.replace(/[,%_()."\\{}]/g, " ").trim()
    if (search) q = q.or(`applicant_name.ilike.%${search}%,phone.ilike.%${search}%${filters.type === "volunteer" ? `,group_name.ilike.%${search}%` : ""}`)
    if (filters.dateBy === "submitted") {
      if (filters.from) q = q.gte("submitted_at", `${filters.from}T00:00:00+09:00`)
      if (filters.to) q = q.lte("submitted_at", `${filters.to}T23:59:59.999+09:00`)
    } else if (filters.from && filters.to) {
      const dates = datesInRange(filters.from, filters.to)
      if (filters.type === "adoption") q = q.overlaps("visit_available_dates", dates)
      else {
        const values = `{${dates.join(",")}}`
        q = q.or(`and(status.eq.일정변경요청,reschedule_dates.ov.${values}),and(status.neq.일정변경요청,available_dates.ov.${values})`)
      }
    }
    return q.order("submitted_at", { ascending: filters.sort === "oldest" }).order("id", { ascending: true })
  }
  const offset = (filters.page - 1) * 20
  const priority = filters.type === "volunteer" && (filters.status === "처리 필요" || filters.status === "전체")
  let rows: AdminApplicationRow[] = [], total = 0
  if (priority) {
    const request = await query("request").range(offset, offset + 19)
    if (request.error) return { ...empty, counts, error: "신청 목록을 불러오지 못했습니다. 새로고침해 주세요." }
    rows = (request.data ?? []) as AdminApplicationRow[]
    const requestCount = request.count ?? 0
    const restOffset = Math.max(0, offset - requestCount)
    const rest = await query("rest").range(restOffset, restOffset + Math.max(1, 20 - rows.length) - 1)
    if (rest.error) return { ...empty, counts, error: "신청 목록을 불러오지 못했습니다. 새로고침해 주세요." }
    if (rows.length < 20) rows.push(...(rest.data ?? []) as AdminApplicationRow[])
    total = requestCount + (rest.count ?? 0)
  } else {
    const result = await query("all").range(offset, offset + 19)
    if (result.error) return { ...empty, counts, error: "신청 목록을 불러오지 못했습니다. 새로고침해 주세요." }
    rows = (result.data ?? []) as AdminApplicationRow[]
    total = result.count ?? 0
  }
  let eventsError = false
  if (filters.type === "volunteer" && rows.length) {
    const linked = await Promise.all(rows.map(async row => {
      const result = await client.from("events").select("id", { count: "exact", head: true }).eq("source_application_type", "volunteer").eq("source_application_id", row.id)
      return { id: row.id, count: result.count ?? 0, error: result.error }
    }))
    eventsError = linked.some(result => !!result.error)
    if (!eventsError) rows = rows.map(row => ({ ...row, linkedCount: linked.find(result => result.id === row.id)?.count ?? 0 }))
  }
  return { rows, total, counts, error: "", eventsError }
}
