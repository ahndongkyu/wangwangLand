import { createClient } from "@/shared/lib/supabase/server"
import { fetchAuthorMap, type AuthorInfo } from "@/shared/lib/fetch-authors"
import type { StaffAvailability } from "@/shared/types/database"
import {
  getPermanentStaffByDate,
  getPermanentStaffInRange,
} from "../permanent-staff"

export type StaffAvailabilityWithUser = StaffAvailability & {
  user: AuthorInfo | null
  registered_by: AuthorInfo | null
}

/** 특정 기간 내 운영진 출근 일정 조회 (캘린더 뷰용) — 상시 운영진(실장님 등) 포함 */
export async function listStaffAvailability(
  startDate: string,
  endDate: string
): Promise<StaffAvailabilityWithUser[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("staff_availability")
    .select("*")
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: false })

  if (error) {
    console.error("[listStaffAvailability]", error)
    return []
  }

  const rows = (data ?? []) as StaffAvailability[]

  // 작성자 정보 조회 (user_id + registered_by_id)
  const ids = new Set<string>()
  rows.forEach((r) => {
    if (r.user_id) ids.add(r.user_id)
    if (r.registered_by_id) ids.add(r.registered_by_id)
  })
  const authorMap = ids.size > 0 ? await fetchAuthorMap(Array.from(ids)) : {}

  const fromDb: StaffAvailabilityWithUser[] = rows.map((r) => ({
    ...r,
    user: r.user_id ? (authorMap[r.user_id] ?? null) : null,
    registered_by: r.registered_by_id ? (authorMap[r.registered_by_id] ?? null) : null,
  }))

  // 상시 운영진은 가장 앞에 정렬되도록 prepend
  const permanent = getPermanentStaffInRange(startDate, endDate)
  return [...permanent, ...fromDb]
}

/** 특정 날짜들에 출근하는 운영진 조회 (봉사 신청 시 표시용) — 상시 운영진 포함 */
export async function listStaffOnDates(
  dates: string[]
): Promise<Record<string, StaffAvailabilityWithUser[]>> {
  if (dates.length === 0) return {}

  const supabase = await createClient()
  const { data } = await supabase
    .from("staff_availability")
    .select("*")
    .in("date", dates)
    .order("start_time", { ascending: true, nullsFirst: false })

  const rows = (data ?? []) as StaffAvailability[]
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)))
  const authorMap = userIds.length > 0 ? await fetchAuthorMap(userIds) : {}

  // 상시 운영진 (해당 요일에 자동 등록) — 항상 첫 번째로 정렬
  const permanent = getPermanentStaffByDate(dates)

  // 날짜별로 그룹화
  const grouped: Record<string, StaffAvailabilityWithUser[]> = {}
  for (const date of dates) {
    grouped[date] = [...(permanent[date] ?? [])]
  }
  for (const r of rows) {
    if (!grouped[r.date]) grouped[r.date] = []
    grouped[r.date].push({
      ...r,
      user: authorMap[r.user_id] ?? null,
      registered_by: r.registered_by_id ? (authorMap[r.registered_by_id] ?? null) : null,
    })
  }
  return grouped
}

/** 운영진(admin/staff) 목록 조회 — 대리 등록 드롭다운용 */
export interface StaffOption {
  id: string
  nickname: string
  role: "admin" | "staff"
}

export async function listAllStaff(): Promise<StaffOption[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("profiles")
    .select("id, nickname, role")
    .in("role", ["admin", "staff"])
    .order("role", { ascending: true })
    .order("nickname", { ascending: true })

  return ((data ?? []) as StaffOption[])
}
